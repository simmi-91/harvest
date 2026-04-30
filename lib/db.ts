import { Pool, PoolClient, QueryResultRow } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export async function query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
) {
    const result = await pool.query<T>(text, params);
    return result;
}

export async function withTransaction<T>(
    fn: (client: PoolClient) => Promise<T>
): Promise<T> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await fn(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export default pool;
