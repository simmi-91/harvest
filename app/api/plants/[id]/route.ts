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
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plants } from '@/lib/schema';
import type { RouteContext } from '@/types';

export async function GET(_request: Request, { params }: RouteContext) {
    try {
        const { id } = await params;
        const idNum = parseInt(id);
        if (isNaN(idNum)) {
            return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
        }

        const plant = await db.query.plants.findFirst({ where: eq(plants.id, idNum) });
        if (!plant) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(plant);
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

        const [plant] = await db
            .update(plants)
            .set({
                ...(name !== undefined && { name }),
                ...(category !== undefined && { category }),
                ...(harvest_instructions !== undefined && { harvest_instructions }),
                ...(tips !== undefined && { tips }),
                ...(latin_name !== undefined && { latin_name }),
                updated_at: new Date(),
            })
            .where(eq(plants.id, idNum))
            .returning();

        if (!plant) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return NextResponse.json(plant);
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
            .delete(plants)
            .where(eq(plants.id, idNum))
            .returning({ id: plants.id });

        if (!deleted) {
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        return new Response(null, { status: 204 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
