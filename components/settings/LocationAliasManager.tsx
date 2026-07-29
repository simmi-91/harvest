'use client';

import { useEffect, useState } from 'react';
import type { LocationAlias } from '@/types';

export function LocationAliasManager() {
    const [aliases, setAliases] = useState<LocationAlias[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
    const [newAlias, setNewAlias] = useState('');
    const [newPosition, setNewPosition] = useState('');
    const [newAddress, setNewAddress] = useState('Ulvenpark');
    const [saving, setSaving] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);

    async function load() {
        const res = await fetch('/api/location-aliases');
        if (res.ok) setAliases(await res.json());
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function handleDelete(id: number) {
        await fetch(`/api/location-aliases/${id}`, { method: 'DELETE' });
        setAliases((prev) => prev.filter((a) => a.id !== id));
        setConfirmDelete(null);
    }

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!newAlias.trim()) return;
        setSaving(true);
        setAddError(null);
        const res = await fetch('/api/location-aliases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                alias: newAlias.trim(),
                canonical_position: newPosition.trim() || null,
                canonical_address: newAddress,
            }),
        });
        if (res.ok || res.status === 201) {
            const created: LocationAlias = await res.json();
            setAliases((prev) =>
                [...prev, created].sort((a, b) => a.alias.localeCompare(b.alias))
            );
            setNewAlias('');
            setNewPosition('');
            setNewAddress('Ulvenpark');
        } else {
            const body = await res.json();
            setAddError(body.error ?? 'Noe gikk galt');
        }
        setSaving(false);
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                <div
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}
                >
                    Legg til alias
                </div>
                <form onSubmit={handleAdd} className="p-4 flex flex-col gap-3">
                    <div className="flex gap-2 flex-wrap">
                        <input
                            type="text"
                            placeholder="Alias (f.eks. Tak AB)"
                            value={newAlias}
                            onChange={(e) => setNewAlias(e.target.value)}
                            className="flex-1 min-w-32 rounded border border-zinc-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        <input
                            type="text"
                            placeholder="Posisjon (f.eks. B)"
                            value={newPosition}
                            onChange={(e) => setNewPosition(e.target.value)}
                            className="w-36 rounded border border-zinc-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        />
                        <select
                            value={newAddress}
                            onChange={(e) => setNewAddress(e.target.value)}
                            className="rounded border border-zinc-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                        >
                            <option value="Ulvenpark">Ulvenpark</option>
                            <option value="Ulven T">Ulven T</option>
                        </select>
                        <button
                            type="submit"
                            disabled={saving || !newAlias.trim()}
                            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            style={{ color: 'var(--text)' }}
                        >
                            {saving ? 'Lagrer…' : 'Legg til'}
                        </button>
                    </div>
                    {addError && <p className="text-sm text-red-600">{addError}</p>}
                </form>
            </div>

            <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                <div
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}
                >
                    Eksisterende aliaser
                </div>
                <div className="divide-y divide-[var(--color3)]">
                    {loading && (
                        <p className="px-4 py-3 text-sm text-zinc-400">Laster…</p>
                    )}
                    {!loading && aliases.length === 0 && (
                        <p className="px-4 py-3 text-sm text-zinc-400">Ingen aliaser registrert.</p>
                    )}
                    {aliases.map((alias) => (
                        <div key={alias.id} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                            <span className="font-medium flex-1" style={{ color: 'var(--text)' }}>
                                {alias.alias}
                            </span>
                            <span className="text-zinc-400">→</span>
                            <span className="text-zinc-600 flex-1">
                                {[alias.canonical_position, alias.canonical_address]
                                    .filter(Boolean)
                                    .join(', ')}
                            </span>
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
            </div>

        </div>
    );
}
