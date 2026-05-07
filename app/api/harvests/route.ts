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
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { harvests, harvestLocations } from '@/lib/schema';
import { handleDatabaseError } from '@/lib/errorHandlers';
import type { HarvestWithDetails, LocationInput, PlantCategory } from '@/types';

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

        let results = await db.query.harvests.findMany({
            where: and(eq(harvests.year, yearNum), eq(harvests.week, weekNum)),
            with: { plant: true, locations: true },
        });

        if (address) results = results.filter((h) => h.locations.some((l) => l.address === address));
        if (position) results = results.filter((h) => h.locations.some((l) => l.position === position));
        results.sort((a, b) => (a.plant?.name ?? '').localeCompare(b.plant?.name ?? ''));

        const response = results.map((h) => ({
            ...h,
            created_at: h.created_at?.toISOString() ?? '',
            updated_at: h.updated_at?.toISOString() ?? '',
            plant_name: h.plant?.name ?? '',
            plant_category: (h.plant?.category ?? 'vegetable') as PlantCategory,
            locations: h.locations.map(({ harvest_id: _hid, ...loc }) => ({
                ...loc,
                boxes: loc.boxes as number[] | null,
            })),
        })) as unknown as HarvestWithDetails[];

        return NextResponse.json(response);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { plant_id, year, week, amount, harvest_note, is_new, locations } = body;

        if (!plant_id || !year || !week || !amount) {
            return NextResponse.json(
                { error: 'plant_id, year, week, and amount are required' },
                { status: 400 },
            );
        }

        const harvest = await db.transaction(async (tx) => {
            const [inserted] = await tx
                .insert(harvests)
                .values({
                    plant_id,
                    year,
                    week,
                    amount,
                    harvest_note: harvest_note ?? null,
                    is_new: is_new ?? false,
                })
                .returning();

            if (Array.isArray(locations) && locations.length > 0) {
                await tx.insert(harvestLocations).values(
                    locations.map((loc: LocationInput) => ({
                        harvest_id: inserted.id,
                        address: loc.address,
                        position: loc.position ?? null,
                        boxes: loc.boxes ?? null,
                        location_note: loc.location_note ?? null,
                    })),
                );
            }

            return inserted;
        });

        return NextResponse.json(harvest, { status: 201 });
    } catch (error: unknown) {
        return handleDatabaseError(error, 'A harvest for this plant, year and week already exists');
    }
}
