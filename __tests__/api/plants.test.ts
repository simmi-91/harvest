import { GET, POST } from '@/app/api/plants/route';
import { GET as GET_ONE, PUT, DELETE } from '@/app/api/plants/[id]/route';
import { query } from '@/lib/db';

jest.mock('@/lib/db', () => ({
    query: jest.fn(),
}));

const mockQuery = jest.mocked(query);

beforeEach(() => {
    jest.clearAllMocks();
});

describe('GET /api/plants', () => {
    it('returns list of plants', async () => {
        const plants = [
            { id: 1, name: 'Basilikum', category: 'herb' },
            { id: 2, name: 'Chili', category: 'vegetable' },
        ];
        mockQuery.mockResolvedValueOnce({ rows: plants } as never);

        const req = new Request('http://localhost/api/plants');
        const res = await GET();
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body).toHaveLength(2);
        expect(body[0].name).toBe('Basilikum');
    });

    it('returns 500 on db error', async () => {
        mockQuery.mockRejectedValueOnce(new Error('DB error') as never);
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
        mockQuery.mockResolvedValueOnce({ rows: [created] } as never);

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
        mockQuery.mockRejectedValueOnce(
            Object.assign(new Error('unique constraint'), { message: 'unique' }) as never
        );

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
        mockQuery.mockResolvedValueOnce({ rows: [] } as never);
        const req = new Request('http://localhost/api/plants/99');
        const res = await GET_ONE(req, { params: Promise.resolve({ id: '99' }) });
        expect(res.status).toBe(404);
    });

    it('returns the plant when found', async () => {
        const plant = { id: 1, name: 'Basilikum', category: 'herb' };
        mockQuery.mockResolvedValueOnce({ rows: [plant] } as never);
        const req = new Request('http://localhost/api/plants/1');
        const res = await GET_ONE(req, { params: Promise.resolve({ id: '1' }) });
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.name).toBe('Basilikum');
    });
});

describe('DELETE /api/plants/[id]', () => {
    it('returns 404 when plant not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] } as never);
        const req = new Request('http://localhost/api/plants/99');
        const res = await DELETE(req, { params: Promise.resolve({ id: '99' }) });
        expect(res.status).toBe(404);
    });

    it('returns 204 on successful delete', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [{ id: 1 }] } as never);
        const req = new Request('http://localhost/api/plants/1');
        const res = await DELETE(req, { params: Promise.resolve({ id: '1' }) });
        expect(res.status).toBe(204);
    });
});

describe('PUT /api/plants/[id]', () => {
    it('returns 404 when plant not found', async () => {
        mockQuery.mockResolvedValueOnce({ rows: [] } as never);
        const req = new Request('http://localhost/api/plants/99', {
            method: 'PUT',
            body: JSON.stringify({ name: 'Ny navn' }),
        });
        const res = await PUT(req, { params: Promise.resolve({ id: '99' }) });
        expect(res.status).toBe(404);
    });

    it('returns updated plant', async () => {
        const updated = { id: 1, name: 'Ny navn', category: 'herb' };
        mockQuery.mockResolvedValueOnce({ rows: [updated] } as never);
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
