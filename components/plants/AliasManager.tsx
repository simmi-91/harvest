'use client';

import { useState } from 'react';
import type { PlantAlias } from '@/types';

export function AliasManager({ plantId, initialAliases }: { plantId: number; initialAliases: PlantAlias[] }) {
    const [aliases, setAliases] = useState(initialAliases);
    const [input, setInput] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!input.trim()) return;
        setSaving(true); setError(null);
        const res = await fetch(`/api/plants/${plantId}/aliases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias: input.trim() }),
        });
        setSaving(false);
        if (res.ok || res.status === 201) {
            const created = await res.json() as PlantAlias;
            setAliases((prev) => [...prev, created].sort((a, b) => a.alias.localeCompare(b.alias)));
            setInput('');
        } else {
            const body = await res.json().catch(() => ({}));
            setError((body as { error?: string }).error ?? 'Feil');
        }
    }

    async function handleDelete(id: number) {
        const res = await fetch(`/api/plant-aliases/${id}`, { method: 'DELETE' });
        if (res.ok || res.status === 204) {
            setAliases((prev) => prev.filter((a) => a.id !== id));
        }
    }

    return (
        <div className="flex flex-col gap-3">
            {aliases.length > 0 ? (
                <ul className="flex flex-col divide-y divide-[var(--color3)] rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                    {aliases.map((a) => (
                        <li key={a.id} className="flex items-center justify-between px-3 py-2">
                            <span className="text-sm text-zinc-800">{a.alias}</span>
                            <button
                                onClick={() => handleDelete(a.id)}
                                className="text-xs text-red-400 hover:text-red-600"
                            >
                                Slett
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-xs text-zinc-400">Ingen aliases lagt til.</p>
            )}

            <form onSubmit={handleAdd} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="f.eks. Grønnkål & Purpurkål"
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <button
                    type="submit"
                    disabled={saving || !input.trim()}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-40"
                >
                    {saving ? '…' : 'Legg til'}
                </button>
            </form>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}
