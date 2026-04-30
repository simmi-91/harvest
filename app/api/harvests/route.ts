/**
 * @swagger
 * /api/harvests:
 *   get:
 *     summary: Get harvests for a given week
 *     parameters:
 *       - name: year
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: week
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: address
 *         in: query
 *         schema:
 *           type: string
 *       - name: position
 *         in: query
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of harvests with plant info and locations
 *       400:
 *         description: Missing required query parameters
 *   post:
 *     summary: Create a new harvest
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HarvestInput'
 *     responses:
 *       201:
 *         description: Created harvest
 *       400:
 *         description: Validation error
 */

import { NextResponse } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import type { HarvestWithDetails } from '@/types';
import type { PoolClient } from 'pg';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        const week = searchParams.get('week');
        const address = searchParams.get('address');
        const position = searchParams.get('position');

        if (!year || !week) {
            return NextResponse.json({ error: 'year and week are required' }, { status: 400 });
        }

        const yearNum = parseInt(year);
        const weekNum = parseInt(week);
        if (isNaN(yearNum) || isNaN(weekNum)) {
            return NextResponse.json({ error: 'year and week must be valid numbers' }, { status: 400 });
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
             WHERE h.year = $1 AND h.week = $2
               AND ($3::varchar IS NULL OR EXISTS (
                   SELECT 1 FROM harvest_locations hl2
                   WHERE hl2.harvest_id = h.id AND hl2.address = $3
               ))
               AND ($4::varchar IS NULL OR EXISTS (
                   SELECT 1 FROM harvest_locations hl2
                   WHERE hl2.harvest_id = h.id AND hl2.position = $4
               ))
             GROUP BY h.id, p.id, p.name, p.category
             ORDER BY p.name`,
            [yearNum, weekNum, address, position]
        );

        return NextResponse.json(result.rows);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

type LocationInput = {
    address: string;
    position?: string;
    boxes?: number[];
    location_note?: string;
};

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { plant_id, year, week, amount, harvest_note, is_new, locations } = body;

        if (!plant_id || !year || !week) {
            return NextResponse.json(
                { error: 'plant_id, year, and week are required' },
                { status: 400 }
            );
        }

        const harvest = await withTransaction(async (client: PoolClient) => {
            const harvestResult = await client.query(
                `INSERT INTO harvests (plant_id, year, week, amount, harvest_note, is_new)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [plant_id, year, week, amount ?? null, harvest_note ?? null, is_new ?? false]
            );

            const inserted = harvestResult.rows[0];

            if (Array.isArray(locations)) {
                for (const loc of locations as LocationInput[]) {
                    await client.query(
                        `INSERT INTO harvest_locations (harvest_id, address, position, boxes, location_note)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [
                            inserted.id,
                            loc.address,
                            loc.position ?? null,
                            loc.boxes ? JSON.stringify(loc.boxes) : null,
                            loc.location_note ?? null,
                        ]
                    );
                }
            }

            return inserted;
        });

        return NextResponse.json(harvest, { status: 201 });
    } catch (error: unknown) {
        if (error instanceof Error && error.message.includes('unique')) {
            return NextResponse.json(
                { error: 'A harvest for this plant, year and week already exists' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
