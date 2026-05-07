import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plants as plantsTable } from '@/lib/schema';
import type { Plant } from '@/types';
import { AddPlantForm } from '@/components/plants/AddPlantForm';
import { PlantList } from '@/components/plants/PlantList';

async function getPlants(): Promise<Plant[]> {
    const rows = await db
        .select({ id: plantsTable.id, name: plantsTable.name, category: plantsTable.category })
        .from(plantsTable)
        .orderBy(asc(plantsTable.name));
    return rows as unknown as Plant[];
}

export default async function PlantsPage() {
    let plants: Plant[] = [];
    let dbError = false;
    try {
        plants = await getPlants();
    } catch {
        dbError = true;
    }

    return (
        <main className="max-w-2xl mx-auto px-4 py-2 sm:py-4 w-full">
            <div className="flex flex-col gap-4">
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>Planter</h1>

                <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                    <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}>
                        Legg til ny plante
                    </div>
                    <div className="p-4">
                        <AddPlantForm />
                    </div>
                </div>

                {dbError && (
                    <p className="text-sm text-red-600">Kunne ikke hente planter fra databasen.</p>
                )}

                {!dbError && <PlantList plants={plants} />}
            </div>
        </main>
    );
}
