import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plantAliases } from '@/lib/schema';

import type { RouteContext } from '@/types';

export async function GET(_req: Request, { params }: RouteContext) {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const aliases = await db
        .select()
        .from(plantAliases)
        .where(eq(plantAliases.plant_id, idNum))
        .orderBy(asc(plantAliases.alias));
    return NextResponse.json(aliases);
}

export async function POST(req: Request, { params }: RouteContext) {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const { alias } = (await req.json()) as { alias?: string };
    if (!alias?.trim()) return NextResponse.json({ error: 'alias is required' }, { status: 400 });

    try {
        const [created] = await db
            .insert(plantAliases)
            .values({ alias: alias.trim(), plant_id: idNum })
            .returning();
        return NextResponse.json(created, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Alias already exists' }, { status: 409 });
    }
}
