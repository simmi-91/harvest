import { POST } from '@/app/api/upload/route';

jest.mock('@/lib/db', () => ({
    db: {
        select: jest.fn(),
    },
}));

jest.mock('@/lib/gemini', () => ({
    parseCombined: jest.fn(),
    GEMINI_MODELS: [{ value: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash' }],
}));

jest.mock('@/lib/pdfToImages', () => ({
    pdfToJpegBase64: jest.fn(),
}));

import { db } from '@/lib/db';
import { parseCombined } from '@/lib/gemini';
import { pdfToJpegBase64 } from '@/lib/pdfToImages';

const mockPdf = new File(['%PDF-1.4'], 'test.pdf', { type: 'application/pdf' });
const mockText = new File(['hello'], 'test.txt', { type: 'text/plain' });

function makeFormData(file: File): FormData {
    const fd = new FormData();
    fd.append('file', file);
    return fd;
}

function makeRequest(file?: File): Request {
    if (!file) {
        return new Request('http://localhost/api/upload', {
            method: 'POST',
            body: new FormData(),
        });
    }
    return new Request('http://localhost/api/upload', {
        method: 'POST',
        body: makeFormData(file),
    });
}

const emptyDbSelect = () => ({
    from: jest.fn().mockReturnValue({
        orderBy: jest.fn().mockResolvedValue([]),
    }),
});

const emptyDbSelectNoOrder = () => ({
    from: jest.fn().mockResolvedValue([]),
});

beforeEach(() => {
    jest.clearAllMocks();
});

describe('POST /api/upload', () => {
    describe('validation', () => {
        it('returns 400 when no file is provided', async () => {
            const res = await POST(makeRequest());
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toMatch(/no file/i);
        });

        it('returns 400 when file is not a PDF', async () => {
            const res = await POST(makeRequest(mockText));
            expect(res.status).toBe(400);
            const body = await res.json();
            expect(body.error).toMatch(/pdf/i);
        });
    });

    describe('PDF conversion errors', () => {
        it('returns 500 when pdfToJpegBase64 throws', async () => {
            (pdfToJpegBase64 as jest.Mock).mockRejectedValueOnce(new Error('Ghostscript not found'));
            const res = await POST(makeRequest(mockPdf));
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toMatch(/ghostscript not found/i);
        });

        it('returns 500 when PDF produces no images', async () => {
            (pdfToJpegBase64 as jest.Mock).mockResolvedValueOnce([]);
            const res = await POST(makeRequest(mockPdf));
            expect(res.status).toBe(500);
        });
    });

    describe('Gemini parsing errors', () => {
        it('returns 500 when parseCombined throws', async () => {
            (pdfToJpegBase64 as jest.Mock).mockResolvedValueOnce(['base64img']);
            (parseCombined as jest.Mock).mockRejectedValueOnce(new Error('Gemini API error'));
            const res = await POST(makeRequest(mockPdf));
            expect(res.status).toBe(500);
            const body = await res.json();
            expect(body.error).toMatch(/gemini api error/i);
        });
    });

    describe('successful parsing', () => {
        beforeEach(() => {
            (pdfToJpegBase64 as jest.Mock).mockResolvedValue(['base64img']);
            (db.select as jest.Mock)
                .mockReturnValueOnce({
                    from: jest.fn().mockReturnValue({
                        orderBy: jest.fn().mockResolvedValue([
                            { id: 1, name: 'Chili', category: 'vegetable', harvest_instructions: null, tips: null, latin_name: null },
                        ]),
                    }),
                })
                .mockReturnValueOnce({ from: jest.fn().mockResolvedValue([]) })
                .mockReturnValueOnce({ from: jest.fn().mockResolvedValue([]) });
        });

        it('returns 200 with resolved entries on success', async () => {
            (parseCombined as jest.Mock).mockResolvedValueOnce({
                year: 2026,
                weeks: [18],
                harvest_entries: [
                    {
                        plant_name: 'Chili',
                        category: null,
                        amount: '5 stk',
                        harvest_note: null,
                        is_new: false,
                        uncertain: false,
                        locations: [],
                    },
                ],
                plant_info: [],
            });

            const res = await POST(makeRequest(mockPdf));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.year).toBe(2026);
            expect(body.weeks).toEqual([18]);
            expect(body.entries).toHaveLength(1);
            expect(body.entries[0].plant_id).toBe(1);
            expect(body.entries[0].plant_name).toBe('Chili');
            expect(body.entries[0].uncertain).toBe(false);
        });

        it('sets uncertain=true when plant is not matched', async () => {
            (parseCombined as jest.Mock).mockResolvedValueOnce({
                year: 2026,
                weeks: [18],
                harvest_entries: [
                    {
                        plant_name: 'UkjentPlante',
                        category: null,
                        amount: null,
                        harvest_note: null,
                        is_new: false,
                        uncertain: false,
                        locations: [],
                    },
                ],
                plant_info: [],
            });

            const res = await POST(makeRequest(mockPdf));
            expect(res.status).toBe(200);
            const body = await res.json();
            expect(body.entries[0].plant_id).toBeNull();
            expect(body.entries[0].uncertain).toBe(true);
        });

        it('returns empty plant_info when none in parsed result', async () => {
            (parseCombined as jest.Mock).mockResolvedValueOnce({
                year: 2026,
                weeks: [18],
                harvest_entries: [],
                plant_info: [],
            });

            const res = await POST(makeRequest(mockPdf));
            const body = await res.json();
            expect(body.plant_info).toEqual([]);
        });
    });
});
