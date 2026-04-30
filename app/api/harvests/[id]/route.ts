/**
 * @swagger
 * /api/harvests/{id}:
 *   get:
 *     summary: Get a harvest by id
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Harvest with plant info and locations
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update a harvest (replaces locations if provided)
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Updated harvest
 *       404:
 *         description: Not found
 *   delete:
 *     summary: Delete a harvest
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
import { query, withTransaction } from '@/lib/db';
import type { HarvestWithDetails } from '@/types';
import type { PoolClient } from 'pg';

type RouteContext = { params: Promise<{ id: string }> };

type LocationInput = {
    address: string;
    position?: string;
    boxes?: number[];
    location_note?: string;
};

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }

        const result = await query<HarvestWithDetails>(
            `SELECT
                h.id, h.plant_id, h.year, h.week, h.amount, h.harvest_note,
                h.is_new, h.is_done, h.created_at, h.updated_at,
                p.name AS plant_name, p.category AS plant_category,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', hl.id,
                            'address', hl.address,
                            'position', hl.position,
                            'boxes', hl.boxes,
                            'location_note', hl.location_note
                        )
                    ) FILTER (WHERE hl.id IS NOT NULL),
                    '[]'::json
                ) AS locations
             FROM harvests h
             JOIN plants p ON h.plant_id = p.id
             LEFT JOIN harvest_locations hl ON hl.harvest_id = h.id
             WHERE h.id = $1
             GROUP BY h.id, p.id, p.name, p.category`,
            [idNum]
        );

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
        const { amount, harvest_note, is_new, is_done, locations } = body;

        const harvest = await withTransaction(async (client: PoolClient) => {
            const result = await client.query(
                `UPDATE harvests SET
                 amount = COALESCE($1, amount),
                 harvest_note = COALESCE($2, harvest_note),
                 is_new = COALESCE($3, is_new),
                 is_done = COALESCE($4, is_done),
                 updated_at = NOW()
                 WHERE id = $5
                 RETURNING *`,
                [
                    amount ?? null,
                    harvest_note ?? null,
                    is_new ?? null,
                    is_done ?? null,
                    idNum,
                ]
            );

            if (result.rows.length === 0) return null;

            if (Array.isArray(locations)) {
                await client.query('DELETE FROM harvest_locations WHERE harvest_id = $1', [idNum]);
                for (const loc of locations as LocationInput[]) {
                    await client.query(
                        `INSERT INTO harvest_locations (harvest_id, address, position, boxes, location_note)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            idNum,
                            loc.address,
                            loc.position ?? null,
                            loc.boxes ? JSON.stringify(loc.boxes) : null,
                            loc.location_note ?? null,
                        ]
                    );
                }
            }

            return result.rows[0];
        });

        if (!harvest) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(harvest);
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

        const result = await query('DELETE FROM harvests WHERE id = $1 RETURNING id', [idNum]);
        if (result.rows.length === 0) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return new Response(null, { status: 204 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
