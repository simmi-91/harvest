import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plantAliases } from '@/lib/schema';

export async function GET() {
    const rows = await db.query.plantAliases.findMany({
        with: { plant: { columns: { id: true, name: true } } },
        orderBy: asc(plantAliases.alias),
    });
    return NextResponse.json(rows);
}
