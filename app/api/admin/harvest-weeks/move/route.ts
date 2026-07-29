import { NextResponse } from 'next/server';
import { and, count, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { harvests } from '@/lib/schema';

export async function POST(req: Request) {
    const body = (await req.json()) as {
        from?: { year: number; week: number };
        to?: { year: number; week: number };
    };

    const fromYear = Number(body.from?.year);
    const fromWeek = Number(body.from?.week);
    const toYear = Number(body.to?.year);
    const toWeek = Number(body.to?.week);

    if (
        !Number.isInteger(fromYear) || !Number.isInteger(fromWeek) ||
        !Number.isInteger(toYear) || !Number.isInteger(toWeek)
    ) {
        return NextResponse.json({ error: 'from and to with year and week are required' }, { status: 400 });
    }

    if (fromYear === toYear && fromWeek === toWeek) {
        return NextResponse.json({ error: 'from and to are the same week' }, { status: 400 });
    }

    const sourceEntries = await db
        .select({ plant_id: harvests.plant_id })
        .from(harvests)
        .where(and(eq(harvests.year, fromYear), eq(harvests.week, fromWeek)));

    if (sourceEntries.length === 0) {
        return NextResponse.json({ error: 'Ingen innslag funnet for kildeuka' }, { status: 404 });
    }

    const sourcePlantIds = sourceEntries
        .map((e) => e.plant_id)
        .filter((id): id is number => id !== null);

    if (sourcePlantIds.length > 0) {
        const [{ conflicts }] = await db
            .select({ conflicts: count() })
            .from(harvests)
            .where(
                and(
                    eq(harvests.year, toYear),
                    eq(harvests.week, toWeek),
                    inArray(harvests.plant_id, sourcePlantIds),
                ),
            );

        if (Number(conflicts) > 0) {
            return NextResponse.json({ conflicts: Number(conflicts) }, { status: 409 });
        }
    }

    await db
        .update(harvests)
        .set({ year: toYear, week: toWeek })
        .where(and(eq(harvests.year, fromYear), eq(harvests.week, fromWeek)));

    return new Response(null, { status: 204 });
}
