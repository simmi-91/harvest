import { GET, POST } from '@/app/api/harvests/route';
import { db } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    db: {
        query: {
            harvests: { findMany: jest.fn() },
        },
        insert: jest.fn(),
        transaction: jest.fn(),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

type MockHarvest = {
    id: number;
    plant_id: number;
    year: number;
    week: number;
    amount: string;
    harvest_note: null;
    is_new: boolean;
    is_done: boolean;
    created_at: Date;
    updated_at: Date;
    plant: { id: number; name: string; category: string };
    locations: { id: number; harvest_id: number; address: string; position: string | null; boxes: null; location_note: null }[];
};

function makeMockHarvest(id: number, plantName: string, category: string, address: string, position: string | null): MockHarvest {
    return {
        id,
        plant_id: id,
        year: 2026,
        week: 18,
        amount: `${id} kg`,
        harvest_note: null,
        is_new: false,
        is_done: false,
        created_at: new Date(),
        updated_at: new Date(),
        plant: { id, name: plantName, category },
        locations: [{ id, harvest_id: id, address, position, boxes: null, location_note: null }],
    };
}

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
                amount: null,
                harvest_note: null,
                is_new: false,
                is_done: false,
                created_at: new Date(),
                updated_at: new Date(),
                plant: { id: 1, name: 'Basilikum', category: 'herb' },
                locations: [],
            },
        ];
        (db.query.harvests.findMany as jest.Mock).mockResolvedValue(mockHarvests);

        const req = new Request('http://localhost/api/harvests?year=2026&week=18');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(Array.isArray(body)).toBe(true);
        expect(body[0].plant_name).toBe('Basilikum');
    });

    it('returns 500 when query throws', async () => {
        (db.query.harvests.findMany as jest.Mock).mockRejectedValue(new Error('DB error'));

        const req = new Request('http://localhost/api/harvests?year=2026&week=18');
        const res = await GET(req);
        expect(res.status).toBe(500);
    });

    it('filters by address and excludes non-matching harvests', async () => {
        (db.query.harvests.findMany as jest.Mock).mockResolvedValue([
            makeMockHarvest(1, 'Basilikum', 'herb', 'Ulvenpark', 'Tak B'),
            makeMockHarvest(2, 'Tomat', 'vegetable', 'Ulven T', null),
        ]);

        const req = new Request('http://localhost/api/harvests?year=2026&week=18&address=Ulvenpark');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(1);
        expect(body[0].plant_name).toBe('Basilikum');
    });

    it('filters by position and includes harvests with null position', async () => {
        (db.query.harvests.findMany as jest.Mock).mockResolvedValue([
            makeMockHarvest(1, 'Basilikum', 'herb', 'Ulvenpark', 'Tak B'),
            makeMockHarvest(2, 'Tomat', 'vegetable', 'Ulvenpark', 'Tak F'),
            makeMockHarvest(3, 'Persille', 'herb', 'Ulvenpark', null),
        ]);

        const req = new Request('http://localhost/api/harvests?year=2026&week=18&position=Tak+B');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(2);
        const names = body.map((h: { plant_name: string }) => h.plant_name);
        expect(names).toContain('Basilikum');
        expect(names).toContain('Persille');
        expect(names).not.toContain('Tomat');
    });

    it('filters by both address and position', async () => {
        (db.query.harvests.findMany as jest.Mock).mockResolvedValue([
            makeMockHarvest(1, 'Basilikum', 'herb', 'Ulvenpark', 'Tak B'),
            makeMockHarvest(2, 'Tomat', 'vegetable', 'Ulven T', 'Tak B'),
            makeMockHarvest(3, 'Persille', 'herb', 'Ulvenpark', null),
        ]);

        const req = new Request('http://localhost/api/harvests?year=2026&week=18&address=Ulvenpark&position=Tak+B');
        const res = await GET(req);
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(2);
        const names = body.map((h: { plant_name: string }) => h.plant_name);
        expect(names).toContain('Basilikum');
        expect(names).toContain('Persille');
        expect(names).not.toContain('Tomat');
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

    it('returns 400 when amount is missing', async () => {
        const req = new Request('http://localhost/api/harvests', {
            method: 'POST',
            body: JSON.stringify({ plant_id: 1, year: 2026, week: 18 }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
    });

    it('creates a harvest and returns 201', async () => {
        const created = { id: 1, plant_id: 1, year: 2026, week: 18, amount: '2 kg', is_new: false };
        const mockTx = {
            insert: jest.fn().mockReturnValue({
                values: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([created]),
                }),
            }),
        };
        (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));

        const req = new Request('http://localhost/api/harvests', {
            method: 'POST',
            body: JSON.stringify({ plant_id: 1, year: 2026, week: 18, amount: '2 kg', locations: [] }),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.id).toBe(1);
    });

    it('returns 409 on duplicate harvest', async () => {
        (db.transaction as jest.Mock).mockRejectedValueOnce(new Error('unique constraint'));

        const req = new Request('http://localhost/api/harvests', {
            method: 'POST',
            body: JSON.stringify({ plant_id: 1, year: 2026, week: 18, amount: '1 kg' }),
        });
        const res = await POST(req);
        expect(res.status).toBe(409);
    });
});
