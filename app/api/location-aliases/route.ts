import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { locationAliases } from '@/lib/schema';
import { handleDatabaseError } from '@/lib/errorHandlers';

export async function GET() {
    const rows = await db
        .select()
        .from(locationAliases)
        .orderBy(asc(locationAliases.alias));
    return NextResponse.json(rows);
}

export async function POST(req: Request) {
    const body = (await req.json()) as {
        alias?: string;
        canonical_position?: string | null;
        canonical_address?: string;
    };

    const alias = body.alias?.trim();
    const canonical_address = body.canonical_address?.trim();

    if (!alias || !canonical_address) {
        return NextResponse.json({ error: 'alias and canonical_address are required' }, { status: 400 });
    }

    try {
        const [created] = await db
            .insert(locationAliases)
            .values({
                alias,
                canonical_position: body.canonical_position?.trim() || null,
                canonical_address,
            })
            .returning();
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        return handleDatabaseError(error, 'Et alias med dette navnet finnes allerede');
    }
}
