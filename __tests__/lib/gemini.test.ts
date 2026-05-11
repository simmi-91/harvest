import { parseCombined } from '@/lib/gemini';

const mockGenerateContent = jest.fn();

jest.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
            generateContent: mockGenerateContent,
        }),
    })),
}));

const validResult = {
    year: 2026,
    weeks: [19],
    harvest_entries: [
        {
            plant_name: 'Chili',
            category: null,
            amount: '3 stk',
            harvest_note: null,
            is_new: false,
            uncertain: false,
            locations: [],
        },
    ],
    plant_info: [],
};

function mockResponse(data: object) {
    return { response: { text: () => JSON.stringify(data) } };
}

const originalEnv = process.env;

beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-key' };
});

afterEach(() => {
    process.env = originalEnv;
});

describe('parseCombined', () => {
    it('throws if GEMINI_API_KEY is not set', async () => {
        delete process.env.GEMINI_API_KEY;
        await expect(parseCombined(['img'])).rejects.toThrow('GEMINI_API_KEY is not set');
    });

    it('returns parsed result with bare JSON response', async () => {
        mockGenerateContent.mockResolvedValueOnce(mockResponse(validResult));

        const result = await parseCombined(['base64img']);
        expect(result.year).toBe(2026);
        expect(result.weeks).toEqual([19]);
        expect(result.harvest_entries).toHaveLength(1);
        expect(result.harvest_entries[0].plant_name).toBe('Chili');
    });

    it('returns parsed result with ```json``` wrapped response', async () => {
        mockGenerateContent.mockResolvedValueOnce({
            response: { text: () => `\`\`\`json\n${JSON.stringify(validResult)}\n\`\`\`` },
        });

        const result = await parseCombined(['base64img']);
        expect(result.year).toBe(2026);
    });

    it('throws immediately for non-retryable errors', async () => {
        mockGenerateContent.mockRejectedValueOnce(new Error('ZodError: invalid input'));

        await expect(parseCombined(['img'])).rejects.toThrow('ZodError');
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('throws immediately for daily quota errors even with 429 code', async () => {
        mockGenerateContent.mockRejectedValueOnce(
            new Error('[429 Too Many Requests] RequestsPerDay limit exceeded'),
        );

        await expect(parseCombined(['img'])).rejects.toThrow();
        expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('throws if response contains no JSON', async () => {
        mockGenerateContent.mockResolvedValueOnce({
            response: { text: () => 'Gemini says: here is your answer' },
        });

        await expect(parseCombined(['img'])).rejects.toThrow('No JSON found');
    });

    describe('retry behavior', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('retries on 429 and succeeds on second attempt', async () => {
            const retryErr = new Error('[429 Too Many Requests]');
            mockGenerateContent
                .mockRejectedValueOnce(retryErr)
                .mockResolvedValueOnce(mockResponse(validResult));

            const promise = parseCombined(['img']);
            await jest.runAllTimersAsync();
            const result = await promise;

            expect(mockGenerateContent).toHaveBeenCalledTimes(2);
            expect(result.year).toBe(2026);
        });

        it('throws after exhausting all retries', async () => {
            const retryErr = new Error('[429 Too Many Requests]');
            mockGenerateContent.mockRejectedValue(retryErr);

            const promise = parseCombined(['img']);
            // Register rejection handler before advancing timers to avoid unhandled rejection
            const assertion = expect(promise).rejects.toThrow('[429');
            await jest.runAllTimersAsync();
            await assertion;

            expect(mockGenerateContent).toHaveBeenCalledTimes(6);
        });
    });
});
