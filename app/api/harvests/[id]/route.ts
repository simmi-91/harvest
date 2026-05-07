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
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { harvests, harvestLocations } from '@/lib/schema';
import type { HarvestWithDetails, LocationInput, PlantCategory, RouteContext } from '@/types';

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }

        const result = await db.query.harvests.findFirst({
            where: eq(harvests.id, idNum),
            with: { plant: true, locations: true },
        });

        if (!result) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        const response = {
            ...result,
            created_at: result.created_at?.toISOString() ?? '',
            updated_at: result.updated_at?.toISOString() ?? '',
            plant_name: result.plant?.name ?? '',
            plant_category: (result.plant?.category ?? 'vegetable') as PlantCategory,
            locations: result.locations.map(({ harvest_id: _hid, ...loc }) => ({
                ...loc,
                boxes: loc.boxes as number[] | null,
            })),
        } as unknown as HarvestWithDetails;

        return NextResponse.json(response);
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
        const { year, week, plant_id, amount, harvest_note, is_new, is_done, locations } = body;

        const harvest = await db.transaction(async (tx) => {
            const [updated] = await tx
                .update(harvests)
                .set({
                    ...(year !== undefined && { year }),
                    ...(week !== undefined && { week }),
                    ...(plant_id !== undefined && { plant_id }),
                    ...(amount !== undefined && { amount }),
                    ...(harvest_note !== undefined && { harvest_note }),
                    ...(is_new !== undefined && { is_new }),
                    ...(is_done !== undefined && { is_done }),
                    updated_at: new Date(),
                })
                .where(eq(harvests.id, idNum))
                .returning();

            if (!updated) return null;

            if (Array.isArray(locations)) {
                await tx.delete(harvestLocations).where(eq(harvestLocations.harvest_id, idNum));
                if (locations.length > 0) {
                    await tx.insert(harvestLocations).values(
                        locations.map((loc: LocationInput) => ({
                            harvest_id: idNum,
                            address: loc.address,
                            position: loc.position ?? null,
                            boxes: loc.boxes ?? null,
                            location_note: loc.location_note ?? null,
                        })),
                    );
                }
            }

            return updated;
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

        const [deleted] = await db
            .delete(harvests)
            .where(eq(harvests.id, idNum))
            .returning({ id: harvests.id });

        if (!deleted) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return new Response(null, { status: 204 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
