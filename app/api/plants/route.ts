/**
 * @swagger
 * /api/plants:
 *   get:
 *     summary: Get all plants
 *     responses:
 *       200:
 *         description: List of plants
 *   post:
 *     summary: Create a new plant
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PlantInput'
 *     responses:
 *       201:
 *         description: Created plant
 *       400:
 *         description: Validation error
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
    try {
        const result = await query('SELECT * FROM plants ORDER BY name');
        return NextResponse.json(result.rows);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, category, harvest_instructions, tips, latin_name } = body;

        if (!name) {
            return NextResponse.json({ error: 'name is required' }, { status: 400 });
        }

        const result = await query(
            `INSERT INTO plants (name, category, harvest_instructions, tips, latin_name)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [name, category ?? 'vegetable', harvest_instructions ?? null, tips ?? null, latin_name ?? null]
        );

        return NextResponse.json(result.rows[0], { status: 201 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('unique')) {
            return NextResponse.json({ error: 'A plant with that name already exists' }, { status: 409 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
