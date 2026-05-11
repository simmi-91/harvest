import { handleDatabaseError } from '@/lib/errorHandlers';

describe('handleDatabaseError', () => {
    it('returns 409 with custom conflictMessage for unique constraint error', async () => {
        const err = new Error('duplicate key value violates unique constraint');
        const res = handleDatabaseError(err, 'Plante med det navnet finnes allerede');
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toBe('Plante med det navnet finnes allerede');
    });

    it('returns 409 with default message when conflictMessage is omitted', async () => {
        const err = new Error('unique constraint violated');
        const res = handleDatabaseError(err);
        expect(res.status).toBe(409);
        const body = await res.json();
        expect(body.error).toMatch(/already exists/);
    });

    it('returns 500 for non-unique database errors', async () => {
        const err = new Error('connection refused');
        const res = handleDatabaseError(err);
        expect(res.status).toBe(500);
        const body = await res.json();
        expect(body.error).toBe('Internal server error');
    });

    it('returns 500 for non-Error values', async () => {
        const res = handleDatabaseError('something went wrong');
        expect(res.status).toBe(500);
    });
});
