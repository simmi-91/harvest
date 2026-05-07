import { notFound } from 'next/navigation';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plants as plantsTable, plantAliases } from '@/lib/schema';
import type { Plant, PlantAlias } from '@/types';
import { EditPlantForm } from '@/components/plants/EditPlantForm';
import { AliasManager } from '@/components/plants/AliasManager';

type Props = { params: Promise<{ id: string }> };

async function getPlant(id: number): Promise<Plant | null> {
    const plant = await db.query.plants.findFirst({ where: eq(plantsTable.id, id) });
    return (plant ?? null) as unknown as Plant | null;
}

async function getAliases(id: number): Promise<PlantAlias[]> {
    const rows = await db
        .select({ id: plantAliases.id, alias: plantAliases.alias, plant_id: plantAliases.plant_id })
        .from(plantAliases)
        .where(eq(plantAliases.plant_id, id))
        .orderBy(asc(plantAliases.alias));
    return rows as unknown as PlantAlias[];
}

export default async function PlantDetailPage({ params }: Props) {
    const { id } = await params;
    const idNum = parseInt(id);
    if (isNaN(idNum)) notFound();

    let plant: Plant | null = null;
    let aliases: PlantAlias[] = [];
    try {
        [plant, aliases] = await Promise.all([getPlant(idNum), getAliases(idNum)]);
    } catch {
        return (
            <main className="max-w-2xl mx-auto px-4 py-2 sm:py-4 w-full">
                <p className="text-sm text-red-600">Kunne ikke hente plante fra databasen.</p>
            </main>
        );
    }

    if (!plant) notFound();

    return (
        <main className="max-w-2xl mx-auto px-4 py-2 sm:py-4 w-full">
            <div className="flex flex-col gap-4">
                <div>
                    <a href="/plants" className="text-sm text-zinc-600 hover:text-zinc-900">← Planter</a>
                    <h1 className="text-xl sm:text-2xl font-bold mt-1" style={{ color: 'var(--text)' }}>{plant.name}</h1>
                    {plant.latin_name && (
                        <p className="text-sm text-zinc-600 italic mt-0.5">{plant.latin_name}</p>
                    )}
                </div>
                <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}>
                        Rediger plante
                    </div>
                    <div className="p-4">
                        <EditPlantForm plant={plant} />
                    </div>
                </div>

                <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}>
                        Alternative navn
                    </div>
                    <div className="p-4">
                        <AliasManager plantId={plant.id} initialAliases={aliases} />
                    </div>
                </div>
            </div>
        </main>
    );
}
