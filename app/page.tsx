import { redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { harvests as harvestsTable, harvestLocations } from '@/lib/schema';
import type { HarvestWithDetails, PlantCategory } from '@/types';
import { FilterBar } from '@/components/harvest/FilterBar';
import { HarvestTable } from '@/components/harvest/HarvestTable';

function formatNorwegianDate(date: Date): string {
    const str = new Intl.DateTimeFormat('nb-NO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    }).format(date);
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCurrentWeek(): { year: number; week: number } {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week };
}

async function getActiveFilters(year: number, week: number): Promise<{ addresses: string[]; positions: string[] }> {
    const rows = await db
        .selectDistinct({ address: harvestLocations.address, position: harvestLocations.position })
        .from(harvestLocations)
        .innerJoin(harvestsTable, eq(harvestLocations.harvest_id, harvestsTable.id))
        .where(and(eq(harvestsTable.year, year), eq(harvestsTable.week, week)));

    const addresses = [...new Set(rows.map((r) => r.address))];
    const positions = [...new Set(rows.map((r) => r.position).filter((p): p is string => p !== null))];
    return { addresses, positions };
}

async function getAvailableYears(currentYear: number): Promise<number[]> {
    const rows = await db
        .selectDistinct({ year: harvestsTable.year })
        .from(harvestsTable)
        .orderBy(asc(harvestsTable.year));
    const years = rows.map((r) => r.year);
    if (!years.includes(currentYear)) years.push(currentYear);
    return years.sort((a, b) => a - b);
}

async function getAvailableWeeks(year: number, currentYear: number, currentWeek: number): Promise<number[]> {
    const rows = await db
        .selectDistinct({ week: harvestsTable.week })
        .from(harvestsTable)
        .where(eq(harvestsTable.year, year))
        .orderBy(asc(harvestsTable.week));
    const weeks = rows.map((r) => r.week);
    if (year === currentYear && !weeks.includes(currentWeek)) weeks.push(currentWeek);
    return weeks.sort((a, b) => a - b);
}

async function getHarvests(
    year: number,
    week: number,
    address: string | undefined,
    position: string | undefined,
): Promise<HarvestWithDetails[]> {
    let results = await db.query.harvests.findMany({
        where: and(eq(harvestsTable.year, year), eq(harvestsTable.week, week)),
        with: { plant: true, locations: true },
    });

    if (address) results = results.filter((h) => h.locations.some((l) => l.address === address));
    if (position) results = results.filter((h) => h.locations.some((l) => l.position === position || l.position === null));
    results.sort((a, b) => (a.plant?.name ?? '').localeCompare(b.plant?.name ?? ''));

    return results.map((h) => ({
        ...h,
        created_at: h.created_at?.toISOString() ?? '',
        updated_at: h.updated_at?.toISOString() ?? '',
        plant_name: h.plant?.name ?? '',
        plant_category: (h.plant?.category ?? 'vegetable') as PlantCategory,
        locations: h.locations.map(({ harvest_id: _hid, ...loc }) => ({
            ...loc,
            boxes: loc.boxes as number[] | null,
        })),
    })) as HarvestWithDetails[];
}

type SearchParams = Promise<{
    year?: string;
    week?: string;
    address?: string;
    position?: string;
}>;

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
    const params = await searchParams;
    const current = getCurrentWeek();

    const year = params.year ? parseInt(params.year) : current.year;
    const week = params.week ? parseInt(params.week) : current.week;
    const address = params.address || undefined;
    const position = params.position || undefined;

    let harvestData: HarvestWithDetails[] = [];
    let availableYears: number[] = [current.year];
    let availableWeeks: number[] = [current.week];
    let activeAddresses: string[] = [];
    let activePositions: string[] = [];
    let dbError = false;
    try {
        const [h, years, weeks, active] = await Promise.all([
            getHarvests(year, week, address, position),
            getAvailableYears(current.year),
            getAvailableWeeks(year, current.year, current.week),
            getActiveFilters(year, week),
        ]);
        harvestData = h;
        availableYears = years;
        availableWeeks = weeks;
        activeAddresses = active.addresses;
        activePositions = active.positions;
    } catch {
        dbError = true;
    }

    if (!dbError && availableWeeks.length > 0 && !availableWeeks.includes(week)) {
        const nearest = availableWeeks.reduce((prev, curr) =>
            Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev,
        );
        const p = new URLSearchParams({ year: String(year), week: String(nearest) });
        if (address) p.set('address', address);
        if (position) p.set('position', position);
        redirect(`/?${p.toString()}`);
    }

    const todayStr = formatNorwegianDate(new Date());

    return (
        <main className="max-w-4xl mx-auto px-4 py-2 sm:py-4 w-full">
            <div className="flex flex-col gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
                        Høstemelding
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
                        {todayStr} · uke {current.week}
                    </p>
                </div>

                <FilterBar year={year} week={week} address={address} position={position} availableYears={availableYears} availableWeeks={availableWeeks} activeAddresses={activeAddresses} activePositions={activePositions} />

                {dbError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Klarte ikke å hente data fra databasen. Sjekk at databasen kjører.
                    </div>
                )}

                {!dbError && harvestData.length === 0 && (
                    <p className="text-zinc-500 text-sm py-8 text-center">
                        Ingen høsting registrert for uke {week}, {year}.
                    </p>
                )}

                {!dbError && harvestData.length > 0 && (
                    <HarvestTable initialHarvests={harvestData} />
                )}
            </div>
        </main>
    );
}
