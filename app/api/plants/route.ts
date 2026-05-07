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
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plants } from '@/lib/schema';
import { handleDatabaseError } from '@/lib/errorHandlers';

export async function GET() {
    try {
        const result = await db.select().from(plants).orderBy(asc(plants.name));
        return NextResponse.json(result);
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

        const [plant] = await db
            .insert(plants)
            .values({
                name,
                category: category ?? 'vegetable',
                harvest_instructions: harvest_instructions ?? null,
                tips: tips ?? null,
                latin_name: latin_name ?? null,
            })
            .returning();

        return NextResponse.json(plant, { status: 201 });
    } catch (error: unknown) {
        return handleDatabaseError(error, 'A plant with that name already exists');
    }
}
