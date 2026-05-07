'use client';

import { useState } from 'react';
import type { Plant } from '@/types';
import { DeletePlantButton } from './DeletePlantButton';

export function PlantList({ plants }: { plants: Plant[] }) {
    const [search, setSearch] = useState('');

    const filtered = search.trim()
        ? plants.filter((p) =>
              p.name.toLowerCase().includes(search.toLowerCase()) ||
              p.category.toLowerCase().includes(search.toLowerCase()),
          )
        : plants;

    return (
        <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
            <div className="px-4 py-2" style={{ backgroundColor: 'var(--color3)' }}>
                <input
                    type="text"
                    placeholder="Søk etter plante eller kategori…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold placeholder:font-normal placeholder:text-zinc-500 focus:outline-none"
                    style={{ color: 'var(--text)' }}
                />
            </div>
            {filtered.length === 0 ? (
                <p className="px-4 py-6 text-sm text-zinc-600 text-center">
                    {search.trim() ? 'Ingen planter matcher søket.' : 'Ingen planter lagt til ennå.'}
                </p>
            ) : (
                <table className="w-full text-sm">
                    <thead style={{ backgroundColor: 'var(--color3)' }}>
                        <tr>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text)' }}>Navn</th>
                            <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text)' }}>Kategori</th>
                            <th className="px-4 py-2" />
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color3)]">
                        {filtered.map((plant) => (
                            <tr key={plant.id}>
                                <td className="px-4 py-2 font-medium text-zinc-900">
                                    <a href={`/plants/${plant.id}`} className="inline-flex items-center gap-1.5 hover:underline group">
                                        <span className="text-zinc-400 group-hover:text-zinc-700 text-sm leading-none transition-colors">✎</span>
                                        {plant.name}
                                    </a>
                                </td>
                                <td className="px-4 py-2 text-zinc-700">{plant.category}</td>
                                <td className="px-4 py-2 text-right">
                                    <DeletePlantButton id={plant.id} name={plant.name} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
