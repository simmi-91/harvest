import type { HarvestWithDetails } from '@/types';

interface HarvestCardProps {
    harvest: HarvestWithDetails;
}

export function HarvestCard({ harvest }: HarvestCardProps) {
    return (
        <div className="bg-white rounded-lg border border-zinc-200 p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-zinc-900">{harvest.plant_name}</h3>
                <div className="flex gap-1 shrink-0">
                    {harvest.is_new && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                            Ny
                        </span>
                    )}
                    {harvest.is_done && (
                        <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-medium">
                            Ferdig
                        </span>
                    )}
                </div>
            </div>

            {harvest.amount && (
                <p className="text-sm text-zinc-700">{harvest.amount}</p>
            )}

            {harvest.locations.length > 0 && (
                <ul className="text-sm text-zinc-600 space-y-0.5">
                    {harvest.locations.map((loc) => (
                        <li key={loc.id}>
                            <span className="font-medium">
                                {loc.position ? `Tak ${loc.position}` : loc.address}
                            </span>
                            {loc.boxes && loc.boxes.length > 0 && (
                                <span className="text-zinc-400"> – kasse {loc.boxes.join(', ')}</span>
                            )}
                            {loc.location_note && (
                                <span className="text-zinc-400"> ({loc.location_note})</span>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {harvest.harvest_note && (
                <p className="text-xs text-zinc-400 italic mt-1">{harvest.harvest_note}</p>
            )}
        </div>
    );
}
