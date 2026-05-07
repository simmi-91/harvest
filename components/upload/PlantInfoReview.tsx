'use client';

import { useState } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { PLANT_CATEGORIES } from '@/lib/plantCategories';
import type { PlantCategory, ResolvedPlantInfo } from '@/types';

export type PlantEdits = {
    latin_name?: string | null;
    harvest_instructions?: string | null;
    tips?: string | null;
    category?: PlantCategory;
    skip?: boolean;
};

interface Props {
    plantInfo: ResolvedPlantInfo[];
    saving: boolean;
    onConfirm: (edits: Map<number, PlantEdits>) => void;
    onSkipAll: () => void;
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

export function PlantInfoReview({ plantInfo, saving, onConfirm, onSkipAll }: Props) {
    const [edits, setEdits] = useState<Map<number, PlantEdits>>(new Map());
    const [aliasStates, setAliasStates] = useState<Map<number, AliasState>>(new Map());

    function setEdit(i: number, patch: Partial<PlantEdits>) {
        setEdits((prev) => {
            const next = new Map(prev);
            next.set(i, { ...next.get(i), ...patch });
            return next;
        });
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
        const current = edits.get(i)?.skip ?? false;
        setEdit(i, { skip: !current });
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
                        onClick={() => onConfirm(edits)}
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
                    const showAliasBtn = !info.is_new && info.plant_id !== null && info.raw_name !== info.plant_name;
                    const aliasState = aliasStates.get(i);

                    return (
                        <div key={i} className={`rounded-lg border transition-opacity ${isSkipped ? 'opacity-40 border-zinc-100 bg-zinc-50' : 'border-zinc-200 bg-white'}`}>
                            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <StatusBadge info={info} />
                                    <span className="font-medium text-zinc-900">{info.plant_name}</span>
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
                                </div>
                                <button
                                    onClick={() => toggleSkip(i)}
                                    className={`shrink-0 text-xs rounded px-2 py-0.5 border transition-colors ${isSkipped ? 'bg-zinc-200 border-zinc-300 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-400 hover:bg-zinc-100'}`}
                                >
                                    {isSkipped ? 'Gjenopprett' : 'Hopp over'}
                                </button>
                            </div>

                            {!isSkipped && (
                                <div className="px-4 py-3 flex flex-col gap-4">
                                    {/* Category (only for new plants) */}
                                    {info.is_new && (
                                        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
                                            <label className="text-xs font-medium text-zinc-500 sm:w-28 sm:shrink-0">Kategori</label>
                                            <select
                                                value={cat}
                                                onChange={(e) => setEdit(i, { category: e.target.value as PlantCategory })}
                                                className="rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                                            >
                                                {PLANT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                                            </select>
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
                                        {latinNameChanged && info.existing_latin_name && (
                                            <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1.5 text-xs text-zinc-500">
                                                <span className="text-zinc-400 font-medium block mb-0.5">Eksisterende:</span>
                                                {info.existing_latin_name}
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
                                            <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1.5 text-xs text-zinc-500 whitespace-pre-wrap">
                                                <span className="text-zinc-400 font-medium block mb-1">Eksisterende:</span>
                                                {info.existing_harvest_instructions}
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
                                            <div className="rounded bg-zinc-50 border border-zinc-100 px-2 py-1.5 text-xs text-zinc-500 whitespace-pre-wrap">
                                                <span className="text-zinc-400 font-medium block mb-1">Eksisterende:</span>
                                                {info.existing_tips}
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
