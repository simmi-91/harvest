import { GET, POST } from '@/app/api/harvests/route';
import { query, withTransaction } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    query: jest.fn(),
    withTransaction: jest.fn(),
}));

const mockQuery = jest.mocked(query);
const mockWithTransaction = jest.mocked(withTransaction);

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/harvests', () => {
    it('returns 400 when year is missing', async () => {
        const req = new Request('http://localhost/api/harvests?week=18');
        const res = await GET(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/year and week/);
    });

    it('returns 400 when week is missing', async () => {
        const req = new Request('http://localhost/api/harvests?year=2026');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('returns 400 when year is not a number', async () => {
        const req = new Request('http://localhost/api/harvests?year=abc&week=18');
        const res = await GET(req);
        expect(res.status).toBe(400);
    });

    it('returns harvests for valid year and week', async () => {
        const mockHarvests = [
            {
                id: 1,
                plant_id: 1,
                year: 2026,
                week: 18,
                plant_name: 'Basilikum',
                plant_category: 'herb',
                locations: [],
            },
        ];
        mockQuery.mockResolvedValueOnce({ rows: mockHarvests } as never);

        const req = new Request('http://localhost/api/harvests?year=2026&week=18');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].plant_name).toBe('Basilikum');
    });

    it('returns 500 when query throws', async () => {
        mockQuery.mockRejectedValueOnce(new Error('DB error') as never);

        const req = new Request('http://localhost/api/harvests?year=2026&week=18');
        const res = await GET(req);
        expect(res.status).toBe(500);
    });
});

describe('POST /api/harvests', () => {
    it('returns 400 when plant_id is missing', async () => {
        const req = new Request('http://localhost/api/harvests', {
            method: 'POST',
            body: JSON.stringify({ year: 2026, week: 18 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/plant_id/);
    });

    it('returns 400 when year is missing', async () => {
        const req = new Request('http://localhost/api/harvests', {
            method: 'POST',
            body: JSON.stringify({ plant_id: 1, week: 18 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('creates a harvest and returns 201', async () => {
        const created = { id: 1, plant_id: 1, year: 2026, week: 18, amount: null, is_new: false };
        const mockClient = {
            query: jest.fn().mockResolvedValueOnce({ rows: [created] }),
        };
        mockWithTransaction.mockImplementationOnce(async (fn) => fn(mockClient as never));

        const req = new Request('http://localhost/api/harvests', {
            method: 'POST',
            body: JSON.stringify({ plant_id: 1, year: 2026, week: 18, locations: [] }),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.id).toBe(1);
    });

    it('returns 409 on duplicate harvest', async () => {
        mockWithTransaction.mockRejectedValueOnce(
            Object.assign(new Error('unique constraint'), { message: 'unique' }) as never
        );

        const req = new Request('http://localhost/api/harvests', {
            method: 'POST',
            body: JSON.stringify({ plant_id: 1, year: 2026, week: 18 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(409);
    });
});
