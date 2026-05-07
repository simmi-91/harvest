import { GET, POST } from '@/app/api/plants/route';
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/plants/[id]/route';
import { db } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    db: {
        query: {
            plants: { findFirst: jest.fn() },
        },
        select: jest.fn(),
        insert: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
}));

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/plants', () => {
    it('returns list of plants', async () => {
        const plants = [
            { id: 1, name: 'Basilikum', category: 'herb' },
            { id: 2, name: 'Chili', category: 'vegetable' },
        ];
        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue(plants),
            }),
        });

        const res = await GET();
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(2);
        expect(body[0].name).toBe('Basilikum');
    });

    it('returns 500 on db error', async () => {
        (db.select as jest.Mock).mockReturnValue({
            from: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockRejectedValue(new Error('DB error')),
            }),
        });
        const res = await GET();
        expect(res.status).toBe(500);
    });
});

describe('POST /api/plants', () => {
    it('returns 400 when name is missing', async () => {
        const req = new Request('http://localhost/api/plants', {
            method: 'POST',
            body: JSON.stringify({ category: 'herb' }),
        });
        const res = await POST(req);
        expect(res.status).toBe(400);
        const body = await res.json();
        expect(body.error).toMatch(/name/);
    });

    it('creates a plant and returns 201', async () => {
        const created = { id: 1, name: 'Oregano', category: 'herb' };
        (db.insert as jest.Mock).mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([created]),
            }),
        });

        const req = new Request('http://localhost/api/plants', {
            method: 'POST',
            body: JSON.stringify({ name: 'Oregano', category: 'herb' }),
        });
        const res = await POST(req);
        expect(res.status).toBe(201);
        const body = await res.json();
        expect(body.name).toBe('Oregano');
    });

    it('returns 409 on duplicate name', async () => {
        (db.insert as jest.Mock).mockReturnValue({
            values: jest.fn().mockReturnValue({
                returning: jest.fn().mockRejectedValue(new Error('unique constraint')),
            }),
        });

        const req = new Request('http://localhost/api/plants', {
            method: 'POST',
            body: JSON.stringify({ name: 'Oregano' }),
        });
        const res = await POST(req);
        expect(res.status).toBe(409);
    });
});

describe('GET /api/plants/[id]', () => {
    it('returns 400 for invalid id', async () => {
        const req = new Request('http://localhost/api/plants/abc');
        const res = await GET_ONE(req, { params: Promise.resolve({ id: 'abc' }) });
        expect(res.status).toBe(400);
    });

    it('returns 404 when plant not found', async () => {
        (db.query.plants.findFirst as jest.Mock).mockResolvedValue(undefined);
        const req = new Request('http://localhost/api/plants/99');
        const res = await GET_ONE(req, { params: Promise.resolve({ id: '99' }) });
        expect(res.status).toBe(404);
    });

    it('returns the plant when found', async () => {
        const plant = { id: 1, name: 'Basilikum', category: 'herb' };
        (db.query.plants.findFirst as jest.Mock).mockResolvedValue(plant);
        const req = new Request('http://localhost/api/plants/1');
        const res = await GET_ONE(req, { params: Promise.resolve({ id: '1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.name).toBe('Basilikum');
    });
});

describe('DELETE /api/plants/[id]', () => {
    it('returns 404 when plant not found', async () => {
        (db.delete as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([]),
            }),
        });
        const req = new Request('http://localhost/api/plants/99');
        const res = await DELETE(req, { params: Promise.resolve({ id: '99' }) });
        expect(res.status).toBe(404);
    });

    it('returns 204 on successful delete', async () => {
        (db.delete as jest.Mock).mockReturnValue({
            where: jest.fn().mockReturnValue({
                returning: jest.fn().mockResolvedValue([{ id: 1 }]),
            }),
        });
        const req = new Request('http://localhost/api/plants/1');
        const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
        expect(res.status).toBe(204);
    });
});

describe('PUT /api/plants/[id]', () => {
    it('returns 404 when plant not found', async () => {
        (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([]),
                }),
            }),
        });
        const req = new Request('http://localhost/api/plants/99', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Ny navn' }),
        });
        const res = await PUT(req, { params: Promise.resolve({ id: '99' }) });
        expect(res.status).toBe(404);
    });

    it('returns updated plant', async () => {
        const updated = { id: 1, name: 'Ny navn', category: 'herb' };
        (db.update as jest.Mock).mockReturnValue({
            set: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnValue({
                    returning: jest.fn().mockResolvedValue([updated]),
                }),
            }),
        });
        const req = new Request('http://localhost/api/plants/1', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Ny navn' }),
        });
        const res = await PUT(req, { params: Promise.resolve({ id: '1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.name).toBe('Ny navn');
    });
});
