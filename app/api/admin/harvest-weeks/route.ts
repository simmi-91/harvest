import { NextResponse } from 'next/server';
import { and, count, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { harvests } from '@/lib/schema';

export async function GET() {
    const rows = await db
        .select({
            year: harvests.year,
            week: harvests.week,
            count: count(),
        })
        .from(harvests)
        .groupBy(harvests.year, harvests.week)
        .orderBy(desc(harvests.year), desc(harvests.week));

    return NextResponse.json(rows.map((r) => ({ ...r, count: Number(r.count) })));
}

export async function DELETE(req: Request) {
    const body = (await req.json()) as { year?: number; week?: number };
    const year = Number(body.year);
    const week = Number(body.week);

    if (!Number.isInteger(year) || !Number.isInteger(week)) {
        return NextResponse.json({ error: 'year and week are required' }, { status: 400 });
    }

    await db.delete(harvests).where(and(eq(harvests.year, year), eq(harvests.week, week)));

    return new Response(null, { status: 204 });
}
