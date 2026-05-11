import { GET, PUT, DELETE } from '@/app/api/harvests/[id]/route';
import { db } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    db: {
        query: {
            harvests: { findFirst: jest.fn() },
        },
        transaction: jest.fn(),
        delete: jest.fn(),
    },
}));

function makeParams(id: string): { params: Promise<{ id: string }> } {
    return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/harvests/[id]', () => {
    it('returns 400 for non-numeric id', async () => {
        const req = new Request('http://localhost/api/harvests/abc');
        const res = await GET(req, makeParams('abc'));
        expect(res.status).toBe(400);
    });

    it('returns 404 when harvest not found', async () => {
        (db.query.harvests.findFirst as jest.Mock).mockResolvedValue(undefined);

        const req = new Request('http://localhost/api/harvests/99');
        const res = await GET(req, makeParams('99'));
        expect(res.status).toBe(404);
    });

    it('returns 200 with serialized harvest', async () => {
        const now = new Date();
        (db.query.harvests.findFirst as jest.Mock).mockResolvedValue({
            id: 1,
            plant_id: 2,
            year: 2026,
            week: 19,
            amount: '3 stk',
            harvest_note: null,
            is_new: false,
            is_done: false,
            created_at: now,
            updated_at: now,
            plant: { id: 2, name: 'Chili', category: 'vegetable' },
            locations: [
                { id: 10, harvest_id: 1, address: 'Ulvenpark', position: 'B', boxes: [1, 2], location_note: null },
            ],
        });

        const req = new Request('http://localhost/api/harvests/1');
        const res = await GET(req, makeParams('1'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.id).toBe(1);
        expect(body.plant_name).toBe('Chili');
        expect(body.plant_category).toBe('vegetable');
        expect(body.created_at).toBe(now.toISOString());
        expect(body.locations).toHaveLength(1);
        expect(body.locations[0]).not.toHaveProperty('harvest_id');
    });

    it('returns 500 on db error', async () => {
        (db.query.harvests.findFirst as jest.Mock).mockRejectedValue(new Error('DB error'));

        const req = new Request('http://localhost/api/harvests/1');
        const res = await GET(req, makeParams('1'));
        expect(res.status).toBe(500);
    });
});

describe('PUT /api/harvests/[id]', () => {
    it('returns 400 for non-numeric id', async () => {
        const req = new Request('http://localhost/api/harvests/abc', {
            method: 'PUT',
            body: JSON.stringify({ amount: '5 stk' }),
        });
        const res = await PUT(req, makeParams('abc'));
        expect(res.status).toBe(400);
    });

    it('returns 404 when harvest not found', async () => {
        const mockTx = {
            update: jest.fn().mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([]),
                    }),
                }),
            }),
            delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
            insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) }),
        };
        (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));

        const req = new Request('http://localhost/api/harvests/99', {
            method: 'PUT',
            body: JSON.stringify({ amount: '5 stk' }),
        });
        const res = await PUT(req, makeParams('99'));
        expect(res.status).toBe(404);
    });

    it('returns 200 with updated harvest (no locations)', async () => {
        const updated = { id: 1, plant_id: 2, year: 2026, week: 19, amount: '5 stk', is_new: false };
        const mockTx = {
            update: jest.fn().mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([updated]),
                    }),
                }),
            }),
            delete: jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) }),
            insert: jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) }),
        };
        (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));

        const req = new Request('http://localhost/api/harvests/1', {
            method: 'PUT',
            body: JSON.stringify({ amount: '5 stk' }),
        });
        const res = await PUT(req, makeParams('1'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.amount).toBe('5 stk');
    });

    it('deletes and reinserts locations when locations array is provided', async () => {
        const updated = { id: 1, plant_id: 2, year: 2026, week: 19, amount: '5 stk', is_new: false };
        const mockDelete = jest.fn().mockReturnValue({ where: jest.fn().mockResolvedValue([]) });
        const mockInsert = jest.fn().mockReturnValue({ values: jest.fn().mockResolvedValue([]) });
        const mockTx = {
            update: jest.fn().mockReturnValue({
                set: jest.fn().mockReturnValue({
                    where: jest.fn().mockReturnValue({
                        returning: jest.fn().mockResolvedValue([updated]),
                    }),
                }),
            }),
            delete: mockDelete,
            insert: mockInsert,
        };
        (db.transaction as jest.Mock).mockImplementationOnce(async (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx));

        const locations = [{ address: 'Ulvenpark', position: 'B', boxes: [1], location_note: null }];
        const req = new Request('http://localhost/api/harvests/1', {
            method: 'PUT',
            body: JSON.stringify({ amount: '5 stk', locations }),
        });
        await PUT(req, makeParams('1'));

        expect(mockDelete).toHaveBeenCalledTimes(1);
        expect(mockInsert).toHaveBeenCalledTimes(1);
    });
});

describe('DELETE /api/harvests/[id]', () => {
    it('returns 400 for non-numeric id', async () => {
        const req = new Request('http://localhost/api/harvests/abc');
        const res = await DELETE(req, makeParams('abc'));
        expect(res.status).toBe(400);
    });

    it('returns 404 when harvest not found', async () => {
        (db.delete as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
            }),
        });

        const req = new Request('http://localhost/api/harvests/99');
        const res = await DELETE(req, makeParams('99'));
        expect(res.status).toBe(404);
    });

    it('returns 204 on successful delete', async () => {
        (db.delete as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 1 }]),
            }),
        });

        const req = new Request('http://localhost/api/harvests/1');
        const res = await DELETE(req, makeParams('1'));
        expect(res.status).toBe(204);
    });

    it('returns 500 on db error', async () => {
        (db.delete as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockRejectedValue(new Error('DB error')),
            }),
        });

        const req = new Request('http://localhost/api/harvests/1');
        const res = await DELETE(req, makeParams('1'));
        expect(res.status).toBe(500);
    });
});
