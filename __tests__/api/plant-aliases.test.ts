import { GET, POST } from '@/app/api/plants/[id]/aliases/route';
import { DELETE } from '@/app/api/plant-aliases/[id]/route';
import { db } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    db: {
        select: jest.fn(),
        insert: jest.fn(),
        delete: jest.fn(),
    },
}));

function makeParams(id: string): { params: Promise<{ id: string }> } {
    return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/plants/[id]/aliases', () => {
    it('returns 400 for non-numeric id', async () => {
        const req = new Request('http://localhost/api/plants/abc/aliases');
        const res = await GET(req, makeParams('abc'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/invalid id/i);
    });

    it('returns 200 with alias array', async () => {
        const aliases = [
            { id: 1, alias: 'chilli', plant_id: 5 },
            { id: 2, alias: 'chili', plant_id: 5 },
        ];
        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockResolvedValue(aliases),
                }),
            }),
        });

        const req = new Request('http://localhost/api/plants/5/aliases');
        const res = await GET(req, makeParams('5'));
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(2);
        expect(body[0].alias).toBe('chilli');
    });
});

describe('POST /api/plants/[id]/aliases', () => {
    it('returns 400 for non-numeric id', async () => {
        const req = new Request('http://localhost/api/plants/abc/aliases', {
            method: 'POST',
            body: JSON.stringify({ alias: 'chili' }),
        });
        const res = await POST(req, makeParams('abc'));
        expect(res.status).toBe(400);
    });

    it('returns 400 when alias is missing', async () => {
        const req = new Request('http://localhost/api/plants/5/aliases', {
            method: 'POST',
            body: JSON.stringify({}),
        });
        const res = await POST(req, makeParams('5'));
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/alias/i);
    });

    it('returns 400 when alias is blank', async () => {
        const req = new Request('http://localhost/api/plants/5/aliases', {
            method: 'POST',
            body: JSON.stringify({ alias: '   ' }),
        });
        const res = await POST(req, makeParams('5'));
        expect(res.status).toBe(400);
    });

    it('returns 201 with created alias', async () => {
        const created = { id: 3, alias: 'chili', plant_id: 5 };
        (db.insert as jest.Mock).mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([created]),
            }),
        });

        const req = new Request('http://localhost/api/plants/5/aliases', {
            method: 'POST',
            body: JSON.stringify({ alias: 'chili' }),
        });
        const res = await POST(req, makeParams('5'));
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.alias).toBe('chili');
        expect(body.plant_id).toBe(5);
    });

    it('returns 409 on duplicate alias', async () => {
        (db.insert as jest.Mock).mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn().mockRejectedValue(new Error('unique constraint')),
            }),
        });

        const req = new Request('http://localhost/api/plants/5/aliases', {
            method: 'POST',
            body: JSON.stringify({ alias: 'chili' }),
        });
        const res = await POST(req, makeParams('5'));
        expect(res.status).toBe(409);
    });
});

describe('DELETE /api/plant-aliases/[id]', () => {
    it('returns 400 for non-numeric id', async () => {
        const req = new Request('http://localhost/api/plant-aliases/abc');
        const res = await DELETE(req, makeParams('abc'));
        expect(res.status).toBe(400);
    });

    it('returns 404 when alias not found', async () => {
        (db.delete as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
            }),
        });

        const req = new Request('http://localhost/api/plant-aliases/99');
        const res = await DELETE(req, makeParams('99'));
        expect(res.status).toBe(404);
    });

    it('returns 204 on successful delete', async () => {
        (db.delete as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 3 }]),
            }),
        });

        const req = new Request('http://localhost/api/plant-aliases/3');
        const res = await DELETE(req, makeParams('3'));
        expect(res.status).toBe(204);
    });
});
