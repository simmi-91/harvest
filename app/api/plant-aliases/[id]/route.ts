import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plantAliases } from '@/lib/schema';

import type { RouteContext } from '@/types';

export async function DELETE(_req: Request, { params }: RouteContext) {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

    const [deleted] = await db
        .delete(plantAliases)
        .where(eq(plantAliases.id, idNum))
        .returning({ id: plantAliases.id });

    if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return new Response(null, { status: 204 });
}
