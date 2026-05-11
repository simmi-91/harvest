'use client';

import { useState, useEffect } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { PLANT_CATEGORIES } from '@/lib/plantCategories';
import type { PlantCategory, ResolvedPlantInfo } from '@/types';

type DiffOp = 'equal' | 'delete' | 'insert';
interface DiffPart { type: DiffOp; text: string }

function lcsDiff(a: string[], b: string[]): Array<{ type: DiffOp; value: string }> {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    const result: Array<{ type: DiffOp; value: string }> = [];
    let i = m, j = n;
    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
            result.unshift({ type: 'equal', value: a[i - 1] }); i--; j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            result.unshift({ type: 'insert', value: b[j - 1] }); j--;
        } else {
            result.unshift({ type: 'delete', value: a[i - 1] }); i--;
        }
    }
    return result;
}

function computeCharDiff(oldText: string, newText: string): DiffPart[] {
    const raw = lcsDiff(oldText.split(/(\s+)/), newText.split(/(\s+)/));
    const parts: DiffPart[] = [];
    for (let i = 0; i < raw.length; i++) {
        const curr = raw[i];
        const next = raw[i + 1];
        if (curr.type === 'delete' && next?.type === 'insert' && !/^\s+$/.test(curr.value) && !/^\s+$/.test(next.value)) {
            for (const c of lcsDiff(curr.value.split(''), next.value.split('')))
                parts.push({ type: c.type, text: c.value });
            i++;
        } else {
            parts.push({ type: curr.type, text: curr.value });
        }
    }
    return parts;
}

function computeWordDiff(oldText: string, newText: string): DiffPart[] {
    return lcsDiff(oldText.split(/(\s+)/), newText.split(/(\s+)/))
        .map(op => ({ type: op.type, text: op.value }));
}

function wordDiffRatio(oldText: string, newText: string): number {
    const a = oldText.trim().split(/\s+/);
    const b = newText.trim().split(/\s+/);
    const equalCount = lcsDiff(a, b).filter(o => o.type === 'equal').length;
    return 1 - (2 * equalCount) / (a.length + b.length);
}

function DiffSpans({ parts }: { parts: DiffPart[] }) {
    return (
        <span className="whitespace-pre-wrap break-words">
            {parts.map((part, i) =>
                part.type === 'delete' ? (
                    <span key={i} className="bg-red-100 text-red-600 line-through">{part.text}</span>
                ) : part.type === 'insert' ? (
                    <span key={i} className="bg-green-100 text-green-700">{part.text}</span>
                ) : (
                    <span key={i}>{part.text}</span>
                )
            )}
        </span>
    );
}

function TextDiff({ oldText, newText }: { oldText: string; newText: string }) {
    const ratio = wordDiffRatio(oldText, newText);
    if (ratio > 0.55) {
        return (
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2 rounded bg-red-50 border border-red-100 px-2 py-1 text-red-700">
                    <RotateCcw size={13} className="text-zinc-900 shrink-0" />
                    <span className="whitespace-pre-wrap">{oldText}</span>
                </div>
                <div className="flex items-center gap-2 rounded bg-green-50 border border-green-100 px-2 py-1 text-green-700">
                    <Sparkles size={13} className="text-zinc-900 shrink-0" />
                    <span className="whitespace-pre-wrap">{newText}</span>
                </div>
            </div>
        );
    }
    const parts = ratio <= 0.20 ? computeCharDiff(oldText, newText) : computeWordDiff(oldText, newText);
    return <DiffSpans parts={parts} />;
}

export type PlantEdits = {
    latin_name?: string | null;
    harvest_instructions?: string | null;
    tips?: string | null;
    category?: PlantCategory;
    skip?: boolean;
};

interface Props {
    plantInfo: ResolvedPlantInfo[];
    edits: Map<number, PlantEdits>;
    onEditChange: (i: number, patch: Partial<PlantEdits>) => void;
    saving: boolean;
    onConfirm: () => void;
    onSkipAll: () => void;
    onReassign: (i: number, plantId: number, plantName: string) => void;
}

function FieldActionButton({ icon: Icon, label, onClick }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100"
        >
            <Icon size={13} />
            {label}
        </button>
    );
}

function StatusBadge({ info }: { info: ResolvedPlantInfo }) {
    if (info.is_new)
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Ny plante</span>;
    if (info.uncertain)
        return <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">Usikker match</span>;
    return <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">Endret</span>;
}

type AliasState = 'saving' | 'saved' | 'error';

function PlantSearch({ onSelect, onCancel }: {
    onSelect: (id: number, name: string) => void;
    onCancel: () => void;
}) {
    const [plants, setPlants] = useState<{ id: number; name: string; category: PlantCategory }[]>([]);
    const [query, setQuery] = useState('');

    useEffect(() => {
        fetch('/api/plants').then(r => r.json()).then(data => setPlants(data as { id: number; name: string; category: PlantCategory }[]));
    }, []);

    const filtered = query.trim()
        ? plants.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
        : plants;

    return (
        <div className="flex flex-col gap-1.5 mt-1">
            <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Søk etter plante…"
                className="w-full rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            {filtered.length > 0 && (
                <ul className="max-h-36 overflow-y-auto rounded border border-zinc-200 bg-white shadow-sm">
                    {filtered.slice(0, 20).map(p => (
                        <li key={p.id}>
                            <button type="button" onClick={() => onSelect(p.id, p.name)}
                                className="w-full text-left px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50">
                                <span className="text-zinc-400">[{PLANT_CATEGORIES.find(c => c.value === p.category)?.label}]</span>{' '}{p.name}
                            </button>
                        </li>
                    ))}
                </ul>
            )}
            <button type="button" onClick={onCancel} className="text-xs text-zinc-400 hover:text-zinc-600 text-left">Avbryt</button>
        </div>
    );
}

export function PlantInfoReview({ plantInfo, edits, onEditChange, saving, onConfirm, onSkipAll, onReassign }: Props) {
    const [aliasStates, setAliasStates] = useState<Map<number, AliasState>>(new Map());
    const [openReassign, setOpenReassign] = useState<number | null>(null);

    // Auto-skip entries where all changed fields have < 5% diff
    useEffect(() => {
        plantInfo.forEach((info, i) => {
            if (info.is_new || !info.has_changes) return;
            if (edits.get(i)?.skip !== undefined) return; // user has set this explicitly
            const ratios: number[] = [];
            if (info.new_latin_name !== null && info.new_latin_name !== info.existing_latin_name && info.existing_latin_name)
                ratios.push(wordDiffRatio(info.existing_latin_name, info.new_latin_name));
            if (info.new_harvest_instructions !== null && info.new_harvest_instructions !== info.existing_harvest_instructions && info.existing_harvest_instructions)
                ratios.push(wordDiffRatio(info.existing_harvest_instructions, info.new_harvest_instructions));
            if (info.new_tips !== null && info.new_tips !== info.existing_tips && info.existing_tips)
                ratios.push(wordDiffRatio(info.existing_tips, info.new_tips));
            if (ratios.length > 0 && Math.max(...ratios) < 0.05)
                onEditChange(i, { skip: true });
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plantInfo]);

    function setEdit(i: number, patch: Partial<PlantEdits>) {
        onEditChange(i, patch);
    }

    async function addAlias(i: number, plantId: number, alias: string) {
        setAliasStates((prev) => new Map(prev).set(i, 'saving'));
        const res = await fetch(`/api/plants/${plantId}/aliases`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ alias }),
        });
        setAliasStates((prev) => new Map(prev).set(i, res.ok || res.status === 409 ? 'saved' : 'error'));
    }

    function toggleSkip(i: number) {
        setEdit(i, { skip: !(edits.get(i)?.skip ?? false) });
    }

    function getField(i: number, field: 'latin_name' | 'harvest_instructions' | 'tips', info: ResolvedPlantInfo): string {
        const edit = edits.get(i);
        if (edit && field in edit) return edit[field] ?? '';
        if (field === 'latin_name') return info.new_latin_name ?? info.existing_latin_name ?? '';
        if (field === 'harvest_instructions') return info.new_harvest_instructions ?? info.existing_harvest_instructions ?? '';
        return info.new_tips ?? info.existing_tips ?? '';
    }

    function resetField(i: number, field: 'latin_name' | 'harvest_instructions' | 'tips', value: string | null) {
        setEdit(i, { [field]: value });
    }

    function insertTitle(i: number, field: 'harvest_instructions' | 'tips', info: ResolvedPlantInfo) {
        const existing = field === 'harvest_instructions' ? info.existing_harvest_instructions : info.existing_tips;
        const current = getField(i, field, info);
        const merged = `Tidlig i sesongen:\n${existing ?? ''}\n\nSent i sesongen:\n${current}`;
        setEdit(i, { [field]: merged });
    }

    const activeCount = plantInfo.filter((_, i) => !edits.get(i)?.skip).length;

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-900">Planteinfo fra PDF</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{plantInfo.length} plante{plantInfo.length !== 1 ? 'r' : ''} med ny eller endret info</p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <button onClick={onSkipAll} className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-50">
                        Hopp over alle
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={saving || activeCount === 0}
                        className="rounded-lg bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Lagrer…' : `Lagre ${activeCount} og gå videre`}
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {plantInfo.map((info, i) => {
                    const isSkipped = edits.get(i)?.skip ?? false;
                    const latinName = getField(i, 'latin_name', info);
                    const instructions = getField(i, 'harvest_instructions', info);
                    const tips = getField(i, 'tips', info);
                    const showMergeBtn = info.has_changes;
                    const cat = edits.get(i)?.category ?? info.new_category ?? 'vegetable';
                    const latinNameChanged = !info.is_new && info.new_latin_name !== null && info.new_latin_name !== info.existing_latin_name;
                    const instructionsChanged = !info.is_new && info.new_harvest_instructions !== null && info.new_harvest_instructions !== info.existing_harvest_instructions;
                    const tipsChanged = !info.is_new && info.new_tips !== null && info.new_tips !== info.existing_tips;
                    const showAliasBtn = !info.is_new && info.plant_id !== null && info.raw_name !== info.plant_name && info.uncertain;
                    const aliasState = aliasStates.get(i);
                    const showReassign = !info.is_new;
                    const categoryChanged = !info.is_new && info.new_category !== null && info.new_category !== info.existing_category;

                    return (
                        <div key={i} className={`rounded-lg border transition-opacity ${isSkipped ? 'opacity-40 border-zinc-100 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge info={info} />
                                    <span className="font-medium text-zinc-900">{info.plant_name}</span>
                                    {info.existing_category && (
                                        <span className="text-xs text-zinc-400">
                                            [{PLANT_CATEGORIES.find(c => c.value === info.existing_category)?.label}]
                                        </span>
                                    )}
                                    {info.raw_name !== info.plant_name && (
                                        <span className="text-xs text-zinc-400">PDF: {info.raw_name}</span>
                                    )}
                                    {showAliasBtn && (
                                        aliasState === 'saved' ? (
                                            <span className="text-xs text-green-600">alias lagret</span>
                                        ) : aliasState === 'error' ? (
                                            <span className="text-xs text-red-500">feil ved lagring</span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => addAlias(i, info.plant_id!, info.raw_name)}
                                                disabled={aliasState === 'saving'}
                                                className="text-xs text-zinc-400 hover:text-zinc-700 underline disabled:opacity-40"
                                            >
                                                {aliasState === 'saving' ? 'Lagrer…' : `+ legg til "${info.raw_name}" som alias`}
                                            </button>
                                        )
                                    )}
                                    {showReassign && openReassign !== i && (
                                        <button
                                            type="button"
                                            onClick={() => setOpenReassign(i)}
                                            className="text-xs text-zinc-400 hover:text-zinc-700 underline"
                                        >
                                            koble til annen plante
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => toggleSkip(i)}
                                    className={`shrink-0 text-xs rounded px-2 py-0.5 border transition-colors ${isSkipped ? 'bg-zinc-200 border-zinc-300 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-400 hover:bg-zinc-100'}`}
                                >
                                    {isSkipped ? 'Gjenopprett' : 'Hopp over'}
                                </button>
                            </div>
                            {openReassign === i && (
                                <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50">
                                    <p className="text-xs text-zinc-500 mb-1.5">Koble til annen plante:</p>
                                    <PlantSearch
                                        onSelect={(id, name) => { onReassign(i, id, name); setOpenReassign(null); }}
                                        onCancel={() => setOpenReassign(null)}
                                    />
                                </div>
                            )}

                            {!isSkipped && (
                                <div className="px-4 py-3 flex flex-col gap-4">
                                    {/* Category */}
                                    {(info.is_new || categoryChanged) && (
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                            <label className="text-xs font-medium text-zinc-500 sm:w-28 sm:shrink-0">Kategori</label>
                                            <select
                                                value={cat}
                                                onChange={(e) => setEdit(i, { category: e.target.value as PlantCategory })}
                                                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                            >
                                                {PLANT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
                                            {!info.is_new && info.existing_category && (
                                                <span className="text-xs text-zinc-400">
                                                    eksisterende: {PLANT_CATEGORIES.find(c => c.value === info.existing_category)?.label}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Latin name */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-zinc-500">Latinsk navn</label>
                                        {latinNameChanged && (
                                            <div className="flex gap-2 flex-wrap">
                                                <FieldActionButton icon={Sparkles} label="Gemini-forslag" onClick={() => resetField(i, 'latin_name', info.new_latin_name ?? null)} />
                                                <FieldActionButton icon={RotateCcw} label="Eksisterende" onClick={() => resetField(i, 'latin_name', info.existing_latin_name ?? null)} />
                                            </div>
                                        )}
                                        {latinNameChanged && info.existing_latin_name && info.new_latin_name && (
                                            <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1.5 text-xs text-zinc-500">
                                                <span className="text-zinc-400 font-medium block mb-0.5">Endringer:</span>
                                                <TextDiff oldText={info.existing_latin_name} newText={info.new_latin_name} />
                                            </div>
                                        )}
                                        <input
                                            type="text"
                                            value={latinName}
                                            onChange={(e) => setEdit(i, { latin_name: e.target.value || null })}
                                            placeholder="Ingen"
                                            className="rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                        />
                                    </div>

                                    {/* Harvest instructions */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-zinc-500">Høsteinstruksjoner</label>
                                        {(instructionsChanged || (showMergeBtn && info.existing_harvest_instructions)) && (
                                            <div className="flex gap-2 flex-wrap">
                                                {instructionsChanged && <FieldActionButton icon={Sparkles} label="Gemini-forslag" onClick={() => resetField(i, 'harvest_instructions', info.new_harvest_instructions ?? null)} />}
                                                {instructionsChanged && <FieldActionButton icon={RotateCcw} label="Eksisterende" onClick={() => resetField(i, 'harvest_instructions', info.existing_harvest_instructions ?? null)} />}
                                                {showMergeBtn && info.existing_harvest_instructions && !instructions.includes('Tidlig i sesongen:') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => insertTitle(i, 'harvest_instructions', info)}
                                                        className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100"
                                                    >
                                                        + Legg til tittel (tidlig/sent)
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {info.existing_harvest_instructions && (
                                            <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1.5 text-xs text-zinc-500">
                                                <span className="text-zinc-400 font-medium block mb-1">
                                                    {instructionsChanged && info.new_harvest_instructions ? 'Endringer:' : 'Eksisterende:'}
                                                </span>
                                                {instructionsChanged && info.new_harvest_instructions
                                                    ? <TextDiff oldText={info.existing_harvest_instructions} newText={info.new_harvest_instructions} />
                                                    : <span className="whitespace-pre-wrap">{info.existing_harvest_instructions}</span>
                                                }
                                            </div>
                                        )}
                                        <textarea
                                            value={instructions}
                                            onChange={(e) => setEdit(i, { harvest_instructions: e.target.value || null })}
                                            rows={4}
                                            placeholder="Ingen instruksjoner"
                                            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-y"
                                        />
                                    </div>

                                    {/* Tips */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-xs font-medium text-zinc-500">Tips</label>
                                        {(tipsChanged || (showMergeBtn && info.existing_tips)) && (
                                            <div className="flex gap-2 flex-wrap">
                                                {tipsChanged && <FieldActionButton icon={Sparkles} label="Gemini-forslag" onClick={() => resetField(i, 'tips', info.new_tips ?? null)} />}
                                                {tipsChanged && <FieldActionButton icon={RotateCcw} label="Eksisterende" onClick={() => resetField(i, 'tips', info.existing_tips ?? null)} />}
                                                {showMergeBtn && info.existing_tips && !tips.includes('Tidlig i sesongen:') && (
                                                    <button
                                                        type="button"
                                                        onClick={() => insertTitle(i, 'tips', info)}
                                                        className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100"
                                                    >
                                                        + Legg til tittel (tidlig/sent)
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {info.existing_tips && (
                                            <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1.5 text-xs text-zinc-500">
                                                <span className="text-zinc-400 font-medium block mb-1">
                                                    {tipsChanged && info.new_tips ? 'Endringer:' : 'Eksisterende:'}
                                                </span>
                                                {tipsChanged && info.new_tips
                                                    ? <TextDiff oldText={info.existing_tips} newText={info.new_tips} />
                                                    : <span className="whitespace-pre-wrap">{info.existing_tips}</span>
                                                }
                                            </div>
                                        )}
                                        <textarea
                                            value={tips}
                                            onChange={(e) => setEdit(i, { tips: e.target.value || null })}
                                            rows={3}
                                            placeholder="Ingen tips"
                                            className="w-full rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-y"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
