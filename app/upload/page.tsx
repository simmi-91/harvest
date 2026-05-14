"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PdfDropzone } from "@/components/upload/PdfDropzone";
import { PreviewTable, type EntryEdits } from "@/components/upload/PreviewTable";
import { PlantInfoReview, type PlantEdits } from "@/components/upload/PlantInfoReview";
import type { ParseResponse, ResolvedLocation, PlantCategory, Plant } from "@/types";
import { GEMINI_MODELS, type GeminiModel } from "@/lib/gemini";

function parseApiError(
    raw: string,
    modelLabel: string
): { summary: string; details: string | null } {
    const statusMatch = raw.match(/\[(\d{3}\s+[^\]]+)\]/);
    const jsonStart = raw.lastIndexOf("[{");
    const textPart = (jsonStart > 0 ? raw.slice(0, jsonStart) : raw).trim();
    let formattedJson: string | null = null;
    if (jsonStart > 0) {
        try {
            formattedJson = JSON.stringify(JSON.parse(raw.slice(jsonStart)), null, 2);
        } catch {
            formattedJson = raw.slice(jsonStart);
        }
    }
    if (statusMatch) {
        const isDailyQuota = raw.includes("PerDay");
        const is503 = raw.includes("[503");
        const retryMatch = !isDailyQuota && !is503 && raw.match(/retry in ([\d.]+)s/i);
        const suffix = isDailyQuota
            ? " - daglig kvote nådd, prøv igjen i morgen formiddag"
            : is503
            ? ` - Modellen er for øyeblikket overbelastet - prøv igjen senere eller velg en annen modell`
            : retryMatch
            ? ` - prøv igjen om ${Math.ceil(parseFloat(retryMatch[1]))}s`
            : "";
        return {
            summary: `Gemini API: ${statusMatch[1]}${suffix} - ${modelLabel}`,
            details: textPart + (formattedJson ? "\n\n" + formattedJson : ""),
        };
    }
    return {
        summary: raw.length > 120 ? raw.slice(0, 120) + "…" : raw,
        details: raw.length > 120 ? raw : null,
    };
}

function ErrorCard({
    error,
    onRetry,
    loading,
    modelLabel,
}: {
    error: string;
    onRetry?: () => void;
    loading: boolean;
    modelLabel: string;
}) {
    const [expanded, setExpanded] = useState(false);
    const { summary, details } = parseApiError(error, modelLabel);
    return (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-start gap-3">
                <span className="flex-1">{summary}</span>
                {onRetry && (
                    <button
                        onClick={onRetry}
                        disabled={loading}
                        className="shrink-0 rounded border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40">
                        {loading ? "Prøver…" : "Prøv igjen"}
                    </button>
                )}
            </div>
            {details && (
                <div className="mt-2">
                    <button
                        onClick={() => setExpanded((e) => !e)}
                        className="text-xs text-red-500 hover:text-red-700 underline">
                        {expanded ? "Skjul detaljer" : "Les mer"}
                    </button>
                    {expanded && (
                        <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-all font-mono bg-red-100 rounded p-2 overflow-auto max-h-64">
                            {details}
                        </pre>
                    )}
                </div>
            )}
        </div>
    );
}

function YearWeekInputs({
    year,
    weeks,
    onChange,
}: {
    year: number;
    weeks: number[];
    onChange: (year: number, weeksStr: string) => void;
}) {
    return (
        <span className="flex items-center gap-1.5">
            <span className="text-zinc-400 text-xs">Uke</span>
            <input
                type="text"
                defaultValue={weeks.join(", ")}
                onBlur={(e) => onChange(year, e.target.value)}
                className="w-16 rounded border border-zinc-300 px-1.5 py-0.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-center"
            />
            <input
                type="number"
                defaultValue={year}
                min={2023}
                onBlur={(e) => onChange(parseInt(e.target.value), weeks.join(", "))}
                className="w-20 rounded border border-zinc-300 px-1.5 py-0.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 text-center"
            />
        </span>
    );
}

type Step = "upload" | "plant-review" | "preview" | "saving" | "done";

const CACHE_KEY = "harvest-upload-cache";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CachedUpload {
    filename: string;
    timestamp: number;
    parsed: ParseResponse;
    step?: Exclude<Step, "saving" | "done">;
    skipped?: number[];
    edits?: [number, EntryEdits][];
    plantEdits?: [number, PlantEdits][];
}

function loadCache(): CachedUpload | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw) as CachedUpload;
        if (Date.now() - data.timestamp > CACHE_TTL) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return data;
    } catch {
        return null;
    }
}

export default function UploadPage() {
    const [model, setModel] = useState<GeminiModel>(GEMINI_MODELS[0].value);
    const [step, setStep] = useState<Step>("upload");
    const [loading, setLoading] = useState(false);
    const [loadingMsg, setLoadingMsg] = useState("");
    const lastFileRef = useRef<File | null>(null);
    const lastUsedModelRef = useRef<GeminiModel>(GEMINI_MODELS[0].value);
    const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [savingPlants, setSavingPlants] = useState(false);
    const [filename, setFilename] = useState<string | null>(null);
    const [parsed, setParsed] = useState<ParseResponse | null>(null);
    const [skipped, setSkipped] = useState<Set<number>>(new Set());
    const [edits, setEdits] = useState<Map<number, EntryEdits>>(new Map());
    const [plantEdits, setPlantEdits] = useState<Map<number, PlantEdits>>(new Map());
    const [error, setError] = useState<string | null>(null);
    const [saveResults, setSaveResults] = useState<{
        saved: number;
        skipped: number;
        failed: number;
    } | null>(null);
    const [confirmSave, setConfirmSave] = useState(false);
    const autoSkippedRef = useRef(false);

    // Restore from cache on mount
    useEffect(() => {
        const cached = loadCache();
        if (cached) {
            setParsed(cached.parsed);
            setFilename(cached.filename);
            if (cached.skipped) setSkipped(new Set(cached.skipped));
            if (cached.edits) setEdits(new Map(cached.edits));
            if (cached.plantEdits) setPlantEdits(new Map(cached.plantEdits));
            setStep(
                cached.step ?? (cached.parsed.plant_info.length > 0 ? "plant-review" : "preview")
            );
        }
    }, []);

    // Auto-skip entries that already exist in the DB for the selected year/week(s)
    useEffect(() => {
        if (step !== "preview" || !parsed || autoSkippedRef.current) return;
        autoSkippedRef.current = true;

        async function autoSkipExisting() {
            if (!parsed) return;
            const perWeek = await Promise.all(
                parsed.weeks.map(async (week) => {
                    const res = await fetch(`/api/harvests?year=${parsed.year}&week=${week}`);
                    if (!res.ok) return new Set<number>();
                    const rows = (await res.json()) as { plant_id: number }[];
                    return new Set(rows.map((h) => h.plant_id));
                })
            );
            // Only skip if the plant exists in ALL weeks (nothing new would be saved)
            const existsInAll = new Set<number>();
            if (perWeek.length > 0) {
                for (const id of perWeek[0]) {
                    if (perWeek.every((s) => s.has(id))) existsInAll.add(id);
                }
            }
            if (existsInAll.size === 0) return;
            setSkipped((prev) => {
                const next = new Set(prev);
                parsed.entries.forEach((entry, i) => {
                    if (entry.plant_id && existsInAll.has(entry.plant_id)) next.add(i);
                });
                return next;
            });
        }

        autoSkipExisting();
    }, [step, parsed]);

    // Persist state whenever it changes
    useEffect(() => {
        if (!parsed || !filename || step === "done" || step === "saving" || step === "upload")
            return;
        try {
            localStorage.setItem(
                CACHE_KEY,
                JSON.stringify({
                    filename,
                    timestamp: Date.now(),
                    parsed,
                    step,
                    skipped: Array.from(skipped),
                    edits: Array.from(edits.entries()),
                    plantEdits: Array.from(plantEdits.entries()),
                })
            );
        } catch {
            /* quota exceeded */
        }
    }, [parsed, filename, step, skipped, edits, plantEdits]);

    function toggleSkip(i: number) {
        setSkipped((prev) => {
            const next = new Set(prev);
            if (next.has(i)) next.delete(i);
            else next.add(i);
            return next;
        });
    }

    function handleEdit(
        index: number,
        field: keyof Omit<EntryEdits, "locations">,
        value: string | null
    ) {
        setEdits((prev) => {
            const next = new Map(prev);
            next.set(index, { ...next.get(index), [field]: value });
            return next;
        });
    }

    function handleEditLocations(index: number, locations: ResolvedLocation[]) {
        setEdits((prev) => {
            const next = new Map(prev);
            next.set(index, { ...next.get(index), locations });
            return next;
        });
    }

    const startLoadingMessages = useCallback(() => {
        const stages = [
            [0, "Konverterer PDF til bilder…"],
            [4000, "Sender til Gemini AI…"],
            [12000, "Analyserer innhold… (dette kan ta litt tid)"],
            [30000, "Fortsatt i gang – Gemini er opptatt…"],
            [55000, "Siste forsøk pågår…"],
        ] as const;
        setLoadingMsg(stages[0][1]);
        stages.slice(1).forEach(([delay, msg]) => {
            loadingTimerRef.current = setTimeout(() => setLoadingMsg(msg), delay);
        });
    }, []);

    function stopLoadingMessages() {
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
        setLoadingMsg("");
    }

    async function handleFile(file: File) {
        lastFileRef.current = file;
        lastUsedModelRef.current = model;
        autoSkippedRef.current = false;
        setError(null);
        setLoading(true);
        startLoadingMessages();
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("model", model);
            const res = await fetch("/api/upload", { method: "POST", body: form });
            const body = await res.json();
            if (!res.ok) {
                setError(body.error ?? "Noe gikk galt under opplasting");
                return;
            }
            const data = body as ParseResponse;
            const fileYear = new Date(file.lastModified).getFullYear();
            data.year = fileYear >= 2023 ? fileYear : new Date().getFullYear();
            setParsed(data);
            setFilename(file.name);
            setSkipped(new Set());
            setEdits(new Map());
            setPlantEdits(new Map());
            setStep(data.plant_info.length > 0 ? "plant-review" : "preview");
        } catch {
            setError("Nettverksfeil – kunne ikke nå serveren");
        } finally {
            setLoading(false);
            stopLoadingMessages();
        }
    }

    function handleAddPlant(index: number, plantId: number, plantName: string) {
        setParsed((prev) => {
            if (!prev) return prev;
            const entries = [...prev.entries];
            entries[index] = {
                ...entries[index],
                plant_id: plantId,
                plant_name: plantName,
                uncertain: entries[index].locations.some((l) => l.uncertain),
            };
            return { ...prev, entries };
        });
    }

    async function handleReassignPlantInfo(index: number, plantId: number, plantName: string) {
        const res = await fetch(`/api/plants/${plantId}`);
        if (!res.ok) return;
        const plant = (await res.json()) as Plant;
        setParsed((prev) => {
            if (!prev) return prev;
            const plant_info = [...prev.plant_info];
            const existing = plant_info[index];
            plant_info[index] = {
                ...existing,
                plant_id: plant.id,
                plant_name: plant.name,
                existing_category: plant.category,
                existing_latin_name: plant.latin_name,
                existing_harvest_instructions: plant.harvest_instructions,
                existing_tips: plant.tips,
                is_new: false,
                uncertain: false,
                has_changes:
                    (existing.new_latin_name !== null &&
                        existing.new_latin_name !== plant.latin_name) ||
                    (existing.new_harvest_instructions !== null &&
                        existing.new_harvest_instructions !== plant.harvest_instructions) ||
                    (existing.new_tips !== null && existing.new_tips !== plant.tips),
            };
            return { ...prev, plant_info };
        });
        setPlantEdits((prev) => {
            const next = new Map(prev);
            next.delete(index);
            return next;
        });
    }

    function handlePlantEditChange(i: number, patch: Partial<PlantEdits>) {
        setPlantEdits((prev) => {
            const next = new Map(prev);
            next.set(i, { ...next.get(i), ...patch });
            return next;
        });
    }

    async function handleSavePlants() {
        if (!parsed) return;
        setSavingPlants(true);

        const newPlantIds = new Map<string, { id: number; name: string }>();

        for (let i = 0; i < parsed.plant_info.length; i++) {
            const info = parsed.plant_info[i];
            const edit = plantEdits.get(i) ?? {};
            if (edit.skip) continue;

            const latin_name =
                edit.latin_name !== undefined ? edit.latin_name : info.new_latin_name ?? undefined;
            const harvest_instructions =
                edit.harvest_instructions !== undefined
                    ? edit.harvest_instructions
                    : info.new_harvest_instructions ?? undefined;
            const tips = edit.tips !== undefined ? edit.tips : info.new_tips ?? undefined;

            if (info.is_new) {
                const category: PlantCategory = edit.category ?? info.new_category ?? "vegetable";
                const res = await fetch("/api/plants", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: info.plant_name,
                        category,
                        latin_name,
                        harvest_instructions,
                        tips,
                    }),
                });
                if (res.ok || res.status === 201) {
                    const plant = (await res.json()) as { id: number; name: string };
                    newPlantIds.set(info.raw_name, { id: plant.id, name: plant.name });
                }
            } else if (info.plant_id) {
                const category = edit.category;
                await fetch(`/api/plants/${info.plant_id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        latin_name,
                        harvest_instructions,
                        tips,
                        ...(category !== undefined && { category }),
                    }),
                });
            }
        }

        // Update harvest entries where a newly created plant matches the raw name
        if (newPlantIds.size > 0) {
            setParsed((prev) => {
                if (!prev) return prev;
                const entries = prev.entries.map((e) => {
                    if (e.plant_id !== null) return e;
                    const match = newPlantIds.get(e.raw_plant_name);
                    if (match)
                        return {
                            ...e,
                            plant_id: match.id,
                            plant_name: match.name,
                            uncertain: e.locations.some((l) => l.uncertain),
                        };
                    return e;
                });
                return { ...prev, entries };
            });
        }

        setSavingPlants(false);
        setStep("preview");
    }

    async function handleSave() {
        if (!parsed) return;
        setStep("saving");

        let saved = 0,
            failed = 0,
            skippedCount = 0;

        for (let i = 0; i < parsed.entries.length; i++) {
            const entry = parsed.entries[i];
            if (skipped.has(i) || !entry.plant_id) {
                skippedCount++;
                continue;
            }

            const edit = edits.get(i) ?? {};
            const amount = edit.amount !== undefined ? edit.amount : entry.amount;
            const harvest_note =
                edit.harvest_note !== undefined ? edit.harvest_note : entry.harvest_note;
            const locations = edit.locations ?? entry.locations;

            for (const week of parsed.weeks) {
                const res = await fetch("/api/harvests", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        plant_id: entry.plant_id,
                        year: parsed.year,
                        week,
                        amount,
                        harvest_note,
                        is_new: entry.is_new,
                        locations: locations.map((l) => ({
                            address: l.address,
                            position: l.position,
                            boxes: l.boxes,
                            location_note: l.location_note,
                        })),
                    }),
                });
                if (res.status === 201) saved++;
                else if (res.status === 409) skippedCount++;
                else failed++;
            }
        }

        localStorage.removeItem(CACHE_KEY);
        setSaveResults({ saved, skipped: skippedCount, failed });
        setStep("done");
    }

    const saveableCount = parsed
        ? parsed.entries.filter((e, i) => !skipped.has(i) && e.plant_id).length
        : 0;
    const missingAmountCount = parsed
        ? parsed.entries.filter((e, i) => {
              if (skipped.has(i) || !e.plant_id) return false;
              const edit = edits.get(i);
              return (edit?.amount !== undefined ? edit.amount : e.amount) === null;
          }).length
        : 0;

    function updateYearWeeks(year: number, weeksStr: string) {
        const weeks = weeksStr
            .split(/[\s,]+/)
            .map(Number)
            .filter((n) => Number.isInteger(n) && n >= 1 && n <= 53);
        setParsed((prev) => {
            if (!prev) return prev;
            return { ...prev, year, weeks: weeks.length > 0 ? weeks : prev.weeks };
        });
    }

    function resetToUpload() {
        localStorage.removeItem(CACHE_KEY);
        setParsed(null);
        setFilename(null);
        setEdits(new Map());
        setSkipped(new Set());
        setPlantEdits(new Map());
        setStep("upload");
    }

    return (
        <main className="max-w-5xl mx-auto px-4 py-2 sm:py-4 w-full">
            {step === "upload" && (
                <div className="flex flex-col gap-4">
                    <div>
                        <h1
                            className="text-xl sm:text-2xl font-bold"
                            style={{ color: "var(--text)" }}>
                            Last opp høstemelding
                        </h1>
                        <p className="text-zinc-700 text-sm mt-1">
                            Last opp PDF for ukentlig høsting. Gemini AI analyserer innholdet
                            automatisk.
                        </p>
                    </div>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value as GeminiModel)}
                        className="w-fit rounded border border-zinc-300 px-2 py-1 text-sm text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400">
                        {GEMINI_MODELS.map((m) => (
                            <option key={m.value} value={m.value}>
                                {m.label}
                            </option>
                        ))}
                    </select>
                    <PdfDropzone onFile={handleFile} loading={loading} />
                    {loading && loadingMsg && (
                        <div className="flex items-center gap-3 text-sm text-zinc-700">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600 shrink-0" />
                            {loadingMsg}
                        </div>
                    )}
                    {error && (
                        <ErrorCard
                            error={error}
                            onRetry={
                                lastFileRef.current
                                    ? () => handleFile(lastFileRef.current!)
                                    : undefined
                            }
                            loading={loading}
                            modelLabel={
                                GEMINI_MODELS.find((m) => m.value === lastUsedModelRef.current)?.label ?? lastUsedModelRef.current
                            }
                        />
                    )}
                </div>
            )}

            {step === "plant-review" && parsed && (
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-700 flex-wrap">
                        <span className="font-medium" style={{ color: "var(--text)" }}>
                            Steg 1 av 2
                        </span>
                        <span>–</span>
                        <YearWeekInputs
                            year={parsed.year}
                            weeks={parsed.weeks}
                            onChange={updateYearWeeks}
                        />
                        {filename && <span className="text-zinc-600">· {filename}</span>}
                        <button
                            onClick={resetToUpload}
                            className="ml-auto text-xs text-zinc-600 hover:text-zinc-900 underline">
                            Last opp ny
                        </button>
                    </div>
                    <PlantInfoReview
                        plantInfo={parsed.plant_info}
                        edits={plantEdits}
                        onEditChange={handlePlantEditChange}
                        saving={savingPlants}
                        onConfirm={handleSavePlants}
                        onSkipAll={() => setStep("preview")}
                        onReassign={handleReassignPlantInfo}
                    />
                </div>
            )}

            {step === "preview" && parsed && (
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div>
                            <h1
                                className="text-xl sm:text-2xl font-bold"
                                style={{ color: "var(--text)" }}>
                                Forhåndsvisning
                            </h1>
                            <div className="flex flex-col gap-1 mt-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <YearWeekInputs
                                        year={parsed.year}
                                        weeks={parsed.weeks}
                                        onChange={updateYearWeeks}
                                    />
                                    <span className="text-zinc-600 text-sm">
                                        – {parsed.entries.length} innslag
                                    </span>
                                </div>
                                {filename && <p className="text-zinc-600 text-xs">{filename}</p>}
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                            <button
                                onClick={resetToUpload}
                                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                                Last opp ny
                            </button>
                            {confirmSave ? (
                                <div className="flex items-center gap-2 flex-wrap justify-end">
                                    <div className="text-sm text-right">
                                        <span className="text-zinc-700">
                                            Lagre {saveableCount} innslag for{" "}
                                            <strong>
                                                {parsed.weeks.length === 1
                                                    ? `uke ${parsed.weeks[0]}`
                                                    : `uke ${parsed.weeks.join("+")}`}
                                                , {parsed.year}
                                            </strong>
                                            ?
                                        </span>
                                        {missingAmountCount > 0 && (
                                            <span className="block text-amber-700 text-xs mt-0.5">
                                                {missingAmountCount} innslag mangler mengde
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setConfirmSave(false);
                                            handleSave();
                                        }}
                                        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700">
                                        Ja, lagre
                                    </button>
                                    <button
                                        onClick={() => setConfirmSave(false)}
                                        className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                                        Avbryt
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmSave(true)}
                                    disabled={saveableCount === 0}
                                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed">
                                    Lagre {saveableCount}{" "}
                                    {saveableCount === 1 ? "innslag" : "innslag"}
                                    {parsed.weeks.length > 1 && ` × ${parsed.weeks.length} uker`}
                                </button>
                            )}
                        </div>
                    </div>

                    {(() => {
                        const emptyAmounts = parsed.entries.filter((e) => e.amount === null).length;
                        const mostlyEmpty =
                            parsed.entries.length > 0 &&
                            emptyAmounts / parsed.entries.length >= 0.6;
                        return mostlyEmpty && lastFileRef.current ? (
                            <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800 flex flex-wrap items-center justify-between gap-3">
                                <span>
                                    {emptyAmounts} av {parsed.entries.length} innslag mangler mengde
                                    – Gemini leste kanskje ikke alt.
                                </span>
                                <button
                                    onClick={() => handleFile(lastFileRef.current!)}
                                    disabled={loading}
                                    className="shrink-0 rounded border border-yellow-300 bg-white px-3 py-1 text-xs text-yellow-800 hover:bg-yellow-50 disabled:opacity-40">
                                    {loading ? "Prøver…" : "Prøv igjen"}
                                </button>
                            </div>
                        ) : null;
                    })()}

                    <PreviewTable
                        entries={parsed.entries}
                        edits={edits}
                        skipped={skipped}
                        onToggleSkip={toggleSkip}
                        onAddPlant={handleAddPlant}
                        onEdit={handleEdit}
                        onEditLocations={handleEditLocations}
                    />
                </div>
            )}

            {step === "saving" && (
                <div className="flex flex-col items-center justify-center gap-4 py-24">
                    <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
                    <p className="text-zinc-500 text-sm">Lagrer høstdata…</p>
                </div>
            )}

            {step === "done" && saveResults && (
                <div className="flex flex-col gap-4">
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text)" }}>
                        Lagret!
                    </h1>
                    <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-sm text-green-800 flex flex-col gap-1">
                        <p>
                            <strong>{saveResults.saved}</strong> nye innslag lagret
                        </p>
                        {saveResults.skipped > 0 && (
                            <p className="text-zinc-700">
                                {saveResults.skipped} hoppet over (allerede finnes eller ekskludert)
                            </p>
                        )}
                        {saveResults.failed > 0 && (
                            <p className="text-red-600">
                                {saveResults.failed} feilet – sjekk serverlogen
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <a
                            href="/"
                            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700">
                            Se høsteoversikt
                        </a>
                        <button
                            onClick={() => {
                                setParsed(null);
                                setSaveResults(null);
                                setFilename(null);
                                setEdits(new Map());
                                setPlantEdits(new Map());
                                setStep("upload");
                            }}
                            className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                            Last opp ny rapport
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
