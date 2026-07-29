'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PlantAliasRow {
    id: number;
    alias: string;
    plant_id: number | null;
    plant: { id: number; name: string } | null;
}

export function PlantAliasGlobalList() {
    const [aliases, setAliases] = useState<PlantAliasRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

    async function load() {
        const res = await fetch('/api/plant-aliases');
        if (res.ok) setAliases(await res.json());
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function handleDelete(id: number) {
        await fetch(`/api/plant-aliases/${id}`, { method: 'DELETE' });
        setAliases((prev) => prev.filter((a) => a.id !== id));
        setConfirmDelete(null);
    }

    return (
        <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
            <div
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}
            >
                Plantealiaser
            </div>
            <div className="divide-y divide-[var(--color3)]">
                {loading && (
                    <p className="px-4 py-3 text-sm text-zinc-400">Laster…</p>
                )}
                {!loading && aliases.length === 0 && (
                    <p className="px-4 py-3 text-sm text-zinc-400">Ingen plantealiaser registrert.</p>
                )}
                {aliases.map((alias) => (
                    <div key={alias.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                        <span className="font-medium flex-1" style={{ color: 'var(--text)' }}>
                            {alias.alias}
                        </span>
                        <span className="text-zinc-400">→</span>
                        {alias.plant ? (
                            <Link
                                href={`/plants/${alias.plant.id}`}
                                className="flex-1 text-zinc-600 hover:underline"
                            >
                                {alias.plant.name}
                            </Link>
                        ) : (
                            <span className="flex-1 text-zinc-400 italic">Ukjent plante</span>
                        )}
                        {confirmDelete === alias.id ? (
                            <span className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleDelete(alias.id)}
                                    className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                    Slett
                                </button>
                                <button
                                    onClick={() => setConfirmDelete(null)}
                                    className="text-xs text-zinc-400 hover:text-zinc-600"
                                >
                                    Avbryt
                                </button>
                            </span>
                        ) : (
                            <button
                                onClick={() => setConfirmDelete(alias.id)}
                                className="text-xs text-zinc-400 hover:text-red-600 shrink-0 transition-colors"
                            >
                                Slett
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <div className="px-4 py-3 border-t border-[var(--color3)] text-xs text-zinc-400">
                Legg til nye aliaser via{' '}
                <Link href="/plants" className="underline hover:text-zinc-600">
                    plantesiden
                </Link>
                .
            </div>
        </div>
    );
}
