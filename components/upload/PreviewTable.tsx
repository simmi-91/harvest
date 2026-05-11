'use client';

import { useState, useRef, useEffect } from 'react';
import { PLANT_CATEGORIES } from '@/lib/plantCategories';
import { ADDRESSES, POSITIONS_BY_ADDRESS, formatPosition } from '@/lib/locationUtils';
import type { PlantCategory, ResolvedEntry, ResolvedLocation } from '@/types';

export type EntryEdits = {
    amount?: string | null;
    harvest_note?: string | null;
    locations?: ResolvedLocation[];
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface PreviewTableProps {
    entries: ResolvedEntry[];
    edits: Map<number, EntryEdits>;
    skipped: Set<number>;
    onToggleSkip: (index: number) => void;
    onAddPlant: (index: number, plantId: number, plantName: string) => void;
    onEdit: (index: number, field: keyof Omit<EntryEdits, 'locations'>, value: string | null) => void;
    onEditLocations: (index: number, locations: ResolvedLocation[]) => void;
}

// ── Plant status badge ────────────────────────────────────────────────────────

function PlantBadge({ entry }: { entry: ResolvedEntry }) {
    if (!entry.plant_id)
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Ingen match</span>;
    if (entry.uncertain)
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Usikker</span>;
    return <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Match</span>;
}

// ── Editable text cell ────────────────────────────────────────────────────────

function EditableCell({ value, original, placeholder = '-', emptyWarning = false, onSave }: {
    value: string | null;
    original: string | null;
    placeholder?: string;
    emptyWarning?: boolean;
    onSave: (v: string | null) => void;
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    function commit() { setEditing(false); onSave(draft.trim() || null); }

    if (editing) {
        return (
            <input ref={inputRef} value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
                className="w-full rounded border border-zinc-300 px-2 py-0.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
        );
    }

    return (
        <button onClick={() => { setDraft(value ?? ''); setEditing(true); }} className="group text-left w-full" title="Klikk for å redigere">
            <span className={`text-sm ${value ? 'text-zinc-700' : emptyWarning ? 'text-amber-600' : 'text-zinc-300'} group-hover:underline decoration-dotted`}>
                {value ?? placeholder}{!value && emptyWarning && <span className="ml-1 text-amber-500">⚠</span>}
            </span>
            {value !== original && (
                <span className="block text-xs text-zinc-400 mt-0.5">Oppr.: {original ?? '-'}</span>
            )}
        </button>
    );
}

// ── Location edit form ────────────────────────────────────────────────────────

function LocationEditForm({ location, onSave, onCancel }: {
    location: ResolvedLocation;
    onSave: (loc: ResolvedLocation) => void;
    onCancel: () => void;
}) {
    const [address, setAddress] = useState(location.address ?? 'Ulvenpark');
    const [position, setPosition] = useState(location.position ?? '');
    const [boxes, setBoxes] = useState(location.boxes?.join(', ') ?? '');
    const [note, setNote] = useState(location.location_note ?? '');

    // Reset position if it doesn't exist for the selected address
    useEffect(() => {
        if (position && !POSITIONS_BY_ADDRESS[address]?.includes(position)) {
            setPosition('');
        }
    }, [address, position]);

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const parsedBoxes = boxes.trim()
            ? boxes.split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0)
            : null;
        onSave({
            address,
            position: position || null,
            boxes: parsedBoxes && parsedBoxes.length > 0 ? parsedBoxes : null,
            location_note: note.trim() || null,
            uncertain: false,
        });
    }

    return (
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-2 rounded border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="flex gap-2">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-500">Adresse</label>
                    <select value={address} onChange={(e) => setAddress(e.target.value)}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400">
                        {ADDRESSES.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-zinc-500">Posisjon</label>
                    <select value={position} onChange={(e) => setPosition(e.target.value)}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400">
                        <option value="">Ingen</option>
                        {(POSITIONS_BY_ADDRESS[address] ?? []).map((p) => (
                            <option key={p} value={p}>{formatPosition(address, p)}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex gap-2">
                <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium text-zinc-500">Kasse (kommasep.)</label>
                    <input value={boxes} onChange={(e) => setBoxes(e.target.value)} placeholder="1, 2, 3"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                </div>
                <div className="flex flex-col gap-1 flex-1">
                    <label className="text-xs font-medium text-zinc-500">Notat</label>
                    <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Valgfritt"
                        className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                </div>
            </div>
            <div className="flex gap-2">
                <button type="submit" className="rounded bg-zinc-900 px-3 py-1 text-xs text-white hover:bg-zinc-700">Lagre</button>
                <button type="button" onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-600">Avbryt</button>
            </div>
        </form>
    );
}

// ── Location cell ─────────────────────────────────────────────────────────────

function LocationCell({ locations, entryIndex, onEditLocations }: {
    locations: ResolvedLocation[];
    entryIndex: number;
    onEditLocations: (index: number, locs: ResolvedLocation[]) => void;
}) {
    const [editingLoc, setEditingLoc] = useState<number | null>(null);

    if (locations.length === 0) return <span className="text-zinc-300 text-sm">-</span>;

    function saveLocation(locIdx: number, updated: ResolvedLocation) {
        const next = locations.map((l, i) => (i === locIdx ? updated : l));
        onEditLocations(entryIndex, next);
        setEditingLoc(null);
    }

    return (
        <ul className="space-y-1">
            {locations.map((loc, j) => {
                const addrShort = loc.address === 'Ulvenpark' ? 'UP' : loc.address === 'Ulven T' ? 'UT' : null;
                const restParts: string[] = [];
                if (loc.position) restParts.push(formatPosition(loc.address, loc.position));
                if (loc.boxes && loc.boxes.length > 0) restParts.push(`kasse ${loc.boxes.join(', ')}`);
                if (loc.location_note) restParts.push(loc.location_note);
                const rest = restParts.join(', ');

                return (
                    <li key={j}>
                        <div className="flex items-center gap-1">
                            <span className={`text-sm ${loc.uncertain ? 'text-yellow-700' : 'text-zinc-700'}`}>
                                {addrShort ? (
                                    <>
                                        <span className="sm:hidden">{addrShort}</span>
                                        <span className="hidden sm:inline">{loc.address}</span>
                                        {rest && `, ${rest}`}
                                    </>
                                ) : (rest || '-')}
                            </span>
                            {loc.uncertain && editingLoc !== j && (
                                <button onClick={() => setEditingLoc(j)}
                                    title="Klikk for å korrigere stedet"
                                    className="text-yellow-500 hover:text-yellow-700 text-xs leading-5">
                                    ⚠
                                </button>
                            )}
                            {!loc.uncertain && (
                                <button onClick={() => setEditingLoc(j)}
                                    title="Rediger sted"
                                    className="text-zinc-300 hover:text-zinc-500 text-xs leading-5 opacity-0 group-hover:opacity-100">
                                    ✎
                                </button>
                            )}
                        </div>
                        {editingLoc === j && (
                            <LocationEditForm
                                location={loc}
                                onSave={(updated) => saveLocation(j, updated)}
                                onCancel={() => setEditingLoc(null)}
                            />
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

// ── Plant lookup cache ────────────────────────────────────────────────────────

type PlantOption = { id: number; name: string; category: PlantCategory };
let _plantsCache: PlantOption[] | null = null;
async function fetchPlants(): Promise<PlantOption[]> {
    if (_plantsCache) return _plantsCache;
    const res = await fetch('/api/plants');
    if (!res.ok) return [];
    _plantsCache = (await res.json() as PlantOption[]).sort((a, b) => a.name.localeCompare(b.name));
    return _plantsCache;
}

// ── Select or add plant ───────────────────────────────────────────────────────

function SelectOrAddPlant({ name, onAdd, onCancel }: {
    name: string;
    onAdd: (plantId: number, plantName: string) => void;
    onCancel: () => void;
}) {
    const [mode, setMode] = useState<'search' | 'create'>('search');
    const [plants, setPlants] = useState<PlantOption[]>([]);
    const [query, setQuery] = useState('');
    const [category, setCategory] = useState<PlantCategory>('vegetable');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => { fetchPlants().then(setPlants); }, []);

    const filtered = query.trim()
        ? plants.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
        : plants;

    async function handleCreate(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/plants', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category }) });
            const body = await res.json();
            if (!res.ok) { setError(body.error ?? 'Feil'); return; }
            _plantsCache = null; // invalidate cache
            onAdd(body.id, body.name);
        } finally { setLoading(false); }
    }

    return (
        <div className="mt-1.5 flex flex-col gap-1.5">
            {mode === 'search' ? (
                <>
                    <input
                        autoFocus
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Søk etter plante…"
                        className="w-full rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                    {filtered.length > 0 && (
                        <ul className="max-h-36 overflow-y-auto rounded border border-zinc-200 bg-white shadow-sm">
                            {filtered.map((p) => (
                                <li key={p.id}>
                                    <button
                                        type="button"
                                        onClick={() => onAdd(p.id, p.name)}
                                        className="w-full text-left px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50"
                                    >
                                        <span className="text-zinc-400">[{PLANT_CATEGORIES.find(c => c.value === p.category)?.label}]</span>{' '}{p.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setMode('create')} className="text-xs text-blue-600 hover:text-blue-800">
                            + Opprett ny plante
                        </button>
                        <button type="button" onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-600">Avbryt</button>
                    </div>
                </>
            ) : (
                <form onSubmit={handleCreate} className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-zinc-500">Opprett «{name}» som:</span>
                    <select value={category} onChange={(e) => setCategory(e.target.value as PlantCategory)}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400">
                        {PLANT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <button type="submit" disabled={loading} className="rounded bg-zinc-900 px-2 py-1 text-xs text-white hover:bg-zinc-700 disabled:opacity-40">
                        {loading ? '…' : 'Lagre'}
                    </button>
                    <button type="button" onClick={() => setMode('search')} className="text-xs text-zinc-400 hover:text-zinc-600">Tilbake</button>
                    {error && <span className="text-xs text-red-600">{error}</span>}
                </form>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PreviewTable({ entries, edits, skipped, onToggleSkip, onAddPlant, onEdit, onEditLocations }: PreviewTableProps) {
    const [openAddForm, setOpenAddForm] = useState<number | null>(null);

    const matched = entries.filter((e) => e.plant_id).length;
    const uncertain = entries.filter((e) => e.plant_id && e.uncertain).length;
    const unmatched = entries.filter((e) => !e.plant_id).length;
    const locUncertain = entries.filter((e) => e.locations.some((l) => l.uncertain)).length;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className="text-green-700"><strong>{matched - uncertain}</strong> sikre</span>
                <span className="text-yellow-700"><strong>{uncertain}</strong> usikre</span>
                <span className="text-red-700"><strong>{unmatched}</strong> uten match</span>
                {locUncertain > 0 && <span className="text-yellow-600"><strong>{locUncertain}</strong> usikkert sted</span>}
            </div>

            {/* Mobile card layout */}
            <div className="sm:hidden flex flex-col divide-y divide-[var(--color3)] rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                {entries.map((entry, i) => {
                    const edit = edits.get(i);
                    const displayAmount = edit?.amount !== undefined ? edit.amount : entry.amount;
                    const displayNote = edit?.harvest_note !== undefined ? edit.harvest_note : entry.harvest_note;
                    const displayLocations = edit?.locations ?? entry.locations;
                    const isSkipped = skipped.has(i);

                    return (
                        <div key={i} className={`p-3 flex flex-col gap-2 transition-colors ${isSkipped ? 'opacity-40 bg-zinc-50' : !entry.plant_id ? 'bg-red-50' : ''}`}>
                            {/* Top row: badge + name + skip button */}
                            <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0 flex flex-col gap-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <PlantBadge entry={entry} />
                                        <span className="font-medium text-zinc-900 text-sm">{entry.plant_name}</span>
                                        {entry.is_new && (
                                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Ny</span>
                                        )}
                                    </div>
                                    {entry.raw_plant_name !== entry.plant_name && (
                                        <span className="text-xs text-zinc-400">PDF: {entry.raw_plant_name}</span>
                                    )}
                                </div>
                                <button onClick={() => onToggleSkip(i)}
                                    className={`shrink-0 text-xs rounded px-2 py-0.5 border transition-colors ${isSkipped ? 'bg-zinc-200 border-zinc-300 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-400 hover:bg-zinc-100'}`}>
                                    {isSkipped ? 'Gjenopprett' : 'Hopp over'}
                                </button>
                            </div>

                            {/* Details */}
                            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                                <div>
                                    <div className="text-xs text-zinc-400 mb-0.5">Mengde</div>
                                    <EditableCell value={displayAmount} original={entry.amount} emptyWarning={!isSkipped && !!entry.plant_id && displayAmount === null} onSave={(v) => onEdit(i, 'amount', v)} />
                                </div>
                                <div>
                                    <div className="text-xs text-zinc-400 mb-0.5">Notat</div>
                                    <EditableCell value={displayNote} original={entry.harvest_note} placeholder="-" onSave={(v) => onEdit(i, 'harvest_note', v)} />
                                </div>
                            </div>

                            {/* Locations */}
                            {displayLocations.length > 0 && (
                                <div>
                                    <div className="text-xs text-zinc-400 mb-0.5">Steder</div>
                                    <LocationCell locations={displayLocations} entryIndex={i} onEditLocations={onEditLocations} />
                                </div>
                            )}

                            {/* Add plant */}
                            {!entry.plant_id && openAddForm !== i && (
                                <button onClick={() => setOpenAddForm(i)} className="text-xs text-left text-blue-600 hover:text-blue-800">
                                    + Legg til plante
                                </button>
                            )}
                            {!entry.plant_id && openAddForm === i && (
                                <SelectOrAddPlant
                                    name={entry.plant_name}
                                    onAdd={(id, name) => { onAddPlant(i, id, name); setOpenAddForm(null); }}
                                    onCancel={() => setOpenAddForm(null)}
                                />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Desktop table layout */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border bg-card" style={{ borderColor: 'var(--color3)' }}>
                <table className="w-full text-sm">
                    <thead style={{ backgroundColor: 'var(--color3)' }}>
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: 'var(--text)' }}>Status</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text)' }}>Plante</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text)' }}>Mengde</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text)' }}>Steder</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text)' }}>Notater</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color3)]">
                        {entries.map((entry, i) => {
                            const edit = edits.get(i);
                            const displayAmount = edit?.amount !== undefined ? edit.amount : entry.amount;
                            const displayNote = edit?.harvest_note !== undefined ? edit.harvest_note : entry.harvest_note;
                            const displayLocations = edit?.locations ?? entry.locations;
                            const isSkipped = skipped.has(i);

                            return (
                                <tr key={i} className={`group transition-colors ${isSkipped ? 'opacity-40 bg-zinc-50' : !entry.plant_id ? 'bg-red-50' : ''}`}>
                                    {/* Status */}
                                    <td className="px-3 py-2 whitespace-nowrap align-top">
                                        <PlantBadge entry={entry} />
                                    </td>

                                    {/* Plant */}
                                    <td className="px-3 py-2 align-top">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-medium text-zinc-900">{entry.plant_name}</span>
                                                {entry.is_new && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Ny</span>
                                                )}
                                            </div>
                                            {entry.raw_plant_name !== entry.plant_name && (
                                                <span className="text-xs text-zinc-400">PDF: {entry.raw_plant_name}</span>
                                            )}
                                            {!entry.plant_id && openAddForm !== i && (
                                                <button onClick={() => setOpenAddForm(i)} className="text-xs text-left text-blue-600 hover:text-blue-800 mt-0.5">
                                                    + Legg til plante
                                                </button>
                                            )}
                                            {!entry.plant_id && openAddForm === i && (
                                                <SelectOrAddPlant
                                                    name={entry.plant_name}
                                                    onAdd={(id, name) => { onAddPlant(i, id, name); setOpenAddForm(null); }}
                                                    onCancel={() => setOpenAddForm(null)}
                                                />
                                            )}
                                        </div>
                                    </td>

                                    {/* Amount - editable */}
                                    <td className={`px-3 py-2 min-w-[80px] align-top ${!isSkipped && !!entry.plant_id && displayAmount === null ? 'bg-amber-50' : ''}`}>
                                        <EditableCell value={displayAmount} original={entry.amount} emptyWarning={!isSkipped && !!entry.plant_id && displayAmount === null} onSave={(v) => onEdit(i, 'amount', v)} />
                                    </td>

                                    {/* Locations */}
                                    <td className="px-3 py-2 align-top">
                                        <LocationCell locations={displayLocations} entryIndex={i} onEditLocations={onEditLocations} />
                                    </td>

                                    {/* Note + skip */}
                                    <td className="px-3 py-2 min-w-[140px] align-top">
                                        <div className="flex flex-col gap-1.5">
                                            <EditableCell value={displayNote} original={entry.harvest_note} placeholder="-" onSave={(v) => onEdit(i, 'harvest_note', v)} />
                                            <button onClick={() => onToggleSkip(i)}
                                                className={`self-start text-xs rounded px-2 py-0.5 border transition-colors ${isSkipped ? 'bg-zinc-200 border-zinc-300 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-400 hover:bg-zinc-100'}`}>
                                                {isSkipped ? 'Gjenopprett' : 'Hopp over'}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <p className="text-xs text-zinc-400">
                Klikk mengde eller notat for å redigere. Klikk ⚠ ved et sted for å korrigere adresse og tak.
            </p>
        </div>
    );
}
