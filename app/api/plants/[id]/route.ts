/**
 * @swagger
 * /api/plants/{id}:
 *   get:
 *     summary: Get a plant by id
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Plant object
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a plant
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated plant
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a plant
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Not found
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }

        const result = await query('SELECT * FROM plants WHERE id = $1', [idNum]);
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }

        const body = await request.json();
        const { name, category, harvest_instructions, tips, latin_name } = body;

        const result = await query(
            `UPDATE plants SET
             name = COALESCE($1, name),
             category = COALESCE($2::plant_category, category),
             harvest_instructions = COALESCE($3, harvest_instructions),
             tips = COALESCE($4, tips),
             latin_name = COALESCE($5, latin_name),
             updated_at = NOW()
             WHERE id = $6
             RETURNING *`,
            [name ?? null, category ?? null, harvest_instructions ?? null, tips ?? null, latin_name ?? null, idNum]
        );

        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(result.rows[0]);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }

        const result = await query('DELETE FROM plants WHERE id = $1 RETURNING id', [idNum]);
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return new Response(null, { status: 204 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
