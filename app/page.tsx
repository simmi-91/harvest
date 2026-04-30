import { query } from '@/lib/db';
import type { HarvestWithDetails } from '@/types';
import { FilterBar } from '@/components/harvest/FilterBar';
import { HarvestCard } from '@/components/harvest/HarvestCard';

function getCurrentWeek(): { year: number; week: number } {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week };
}

async function getHarvests(
    year: number,
    week: number,
    address: string | undefined,
    position: string | undefined
): Promise<HarvestWithDetails[]> {
    const result = await query<HarvestWithDetails>(
        `SELECT
            h.id, h.plant_id, h.year, h.week, h.amount, h.harvest_note,
            h.is_new, h.is_done, h.created_at, h.updated_at,
            p.name AS plant_name, p.category AS plant_category,
            COALESCE(
                json_agg(
                    json_build_object(
                        'id', hl.id,
                        'address', hl.address,
                        'position', hl.position,
                        'boxes', hl.boxes,
                        'location_note', hl.location_note
                    )
                ) FILTER (WHERE hl.id IS NOT NULL),
                '[]'::json
            ) AS locations
         FROM harvests h
         JOIN plants p ON h.plant_id = p.id
         LEFT JOIN harvest_locations hl ON hl.harvest_id = h.id
         WHERE h.year = $1 AND h.week = $2
           AND ($3::varchar IS NULL OR EXISTS (
               SELECT 1 FROM harvest_locations hl2
               WHERE hl2.harvest_id = h.id AND hl2.address = $3
           ))
           AND ($4::varchar IS NULL OR EXISTS (
               SELECT 1 FROM harvest_locations hl2
               WHERE hl2.harvest_id = h.id AND hl2.position = $4
           ))
         GROUP BY h.id, p.id, p.name, p.category
         ORDER BY p.name`,
        [year, week, address ?? null, position ?? null]
    );
    return result.rows;
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

    let harvests: HarvestWithDetails[] = [];
    let dbError = false;
    try {
        harvests = await getHarvests(year, week, address, position);
    } catch {
        dbError = true;
    }

    return (
        <main className="max-w-4xl mx-auto px-4 py-8 w-full">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-900">
                        Høsteoversikt
                    </h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Uke {week}, {year}
                    </p>
                </div>

                <FilterBar year={year} week={week} address={address} position={position} />

                {dbError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Klarte ikke å hente data fra databasen. Sjekk at databasen kjører.
                    </div>
                )}

                {!dbError && harvests.length === 0 && (
                    <p className="text-zinc-500 text-sm py-8 text-center">
                        Ingen høsting registrert for uke {week}, {year}.
                    </p>
                )}

                {!dbError && harvests.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {harvests.map((h) => (
                            <HarvestCard key={h.id} harvest={h} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
