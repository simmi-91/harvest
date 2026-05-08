"use client";

import { useState, useEffect } from "react";
import { PlantIcon } from "@/lib/plantCategories";
import {
    ADDRESSES,
    POSITIONS_BY_ADDRESS,
    ADDRESS_BADGE_BG,
    formatPosition,
} from "@/lib/locationUtils";
import { AddressBadge } from "@/components/shared/AddressBadge";
import type { HarvestWithDetails } from "@/types";
import { PlantInfoModal } from "@/components/plants/PlantInfoModal";

// ── Types ─────────────────────────────────────────────────────────────────────

type LocationDraft = {
    address: string;
    position: string | null;
    boxes: string; // comma-separated string while editing
    location_note: string | null;
};

type EditDraft = {
    year: number;
    week: number;
    plant_id: number;
    amount: string;
    harvest_note: string;
    is_new: boolean;
    locations: LocationDraft[];
};

type PlantOption = { id: number; name: string };

// ── Location row editor ───────────────────────────────────────────────────────

function LocationRow({
    loc,
    onChange,
    onRemove,
}: {
    loc: LocationDraft;
    onChange: (updated: LocationDraft) => void;
    onRemove: () => void;
}) {
    function set<K extends keyof LocationDraft>(key: K, val: LocationDraft[K]) {
        onChange({ ...loc, [key]: val });
    }

    const positions = POSITIONS_BY_ADDRESS[loc.address] ?? [];

    return (
        <div className="flex flex-wrap gap-2 items-end border border-zinc-200 rounded p-2 bg-white">
            <div className="flex flex-col gap-0.5">
                <label className="text-xs text-zinc-500">Adresse</label>
                <select
                    value={loc.address}
                    onChange={(e) => {
                        set("address", e.target.value);
                        set("position", null);
                    }}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400">
                    {ADDRESSES.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-0.5">
                <label className="text-xs text-zinc-500">Posisjon</label>
                <select
                    value={loc.position ?? ""}
                    onChange={(e) => set("position", e.target.value || null)}
                    className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400">
                    <option value="">Ingen</option>
                    {positions.map((p) => (
                        <option key={p} value={p}>
                            {formatPosition(loc.address, p)}
                        </option>
                    ))}
                </select>
            </div>
            <div className="flex flex-col gap-0.5">
                <label className="text-xs text-zinc-500">Kasse (kommasep.)</label>
                <input
                    value={loc.boxes}
                    onChange={(e) => set("boxes", e.target.value)}
                    placeholder="1, 2, 3"
                    className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
            </div>
            <div className="flex flex-col gap-0.5">
                <label className="text-xs text-zinc-500">Notat</label>
                <input
                    value={loc.location_note ?? ""}
                    onChange={(e) => set("location_note", e.target.value || null)}
                    placeholder="Valgfritt"
                    className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                />
            </div>
            <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-600 pb-1">
                Fjern
            </button>
        </div>
    );
}

// ── Inline edit form ──────────────────────────────────────────────────────────

function InlineEditForm({
    harvest,
    plants,
    onSave,
    onDelete,
    onCancel,
}: {
    harvest: HarvestWithDetails;
    plants: PlantOption[];
    onSave: (draft: EditDraft) => Promise<void>;
    onDelete: () => Promise<void>;
    onCancel: () => void;
}) {
    const [draft, setDraft] = useState<EditDraft>({
        year: harvest.year,
        week: harvest.week,
        plant_id: harvest.plant_id,
        amount: harvest.amount ?? "",
        harvest_note: harvest.harvest_note ?? "",
        is_new: harvest.is_new,
        locations: harvest.locations.map((l) => ({
            address: l.address,
            position: l.position,
            boxes: l.boxes?.join(", ") ?? "",
            location_note: l.location_note,
        })),
    });
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    function set<K extends keyof EditDraft>(key: K, val: EditDraft[K]) {
        setDraft((prev) => ({ ...prev, [key]: val }));
    }

    function updateLocation(i: number, loc: LocationDraft) {
        setDraft((prev) => {
            const locs = [...prev.locations];
            locs[i] = loc;
            return { ...prev, locations: locs };
        });
    }

    function removeLocation(i: number) {
        setDraft((prev) => ({ ...prev, locations: prev.locations.filter((_, j) => j !== i) }));
    }

    function addLocation() {
        setDraft((prev) => ({
            ...prev,
            locations: [
                ...prev.locations,
                { address: "Ulvenpark", position: null, boxes: "", location_note: null },
            ],
        }));
    }

    async function handleSave() {
        setSaving(true);
        await onSave(draft);
        setSaving(false);
    }

    async function handleDelete() {
        if (!window.confirm(`Slett høsteinnslag for ${harvest.plant_name}? Dette kan ikke angres.`))
            return;
        setDeleting(true);
        await onDelete();
        setDeleting(false);
    }

    return (
        <div className="p-4 bg-zinc-50 flex flex-col gap-4">
            {/* Year + Week + Plant */}
            <div className="flex flex-wrap gap-3">
                <div className="flex flex-col gap-0.5">
                    <label className="text-xs font-medium text-zinc-500">År</label>
                    <input
                        type="number"
                        value={draft.year}
                        onChange={(e) => set("year", parseInt(e.target.value))}
                        className="w-24 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                </div>
                <div className="flex flex-col gap-0.5">
                    <label className="text-xs font-medium text-zinc-500">Uke</label>
                    <input
                        type="number"
                        min={1}
                        max={53}
                        value={draft.week}
                        onChange={(e) => set("week", parseInt(e.target.value))}
                        className="w-20 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-[160px]">
                    <label className="text-xs font-medium text-zinc-500">Plante</label>
                    <select
                        value={draft.plant_id}
                        onChange={(e) => set("plant_id", parseInt(e.target.value))}
                        className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400">
                        {plants.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Amount + Is new */}
            <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-0.5">
                    <label className="text-xs font-medium text-zinc-500">Mengde</label>
                    <input
                        type="text"
                        value={draft.amount}
                        onChange={(e) => set("amount", e.target.value)}
                        placeholder="Ingen"
                        className="w-40 rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400"
                    />
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700 pb-1.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={draft.is_new}
                        onChange={(e) => set("is_new", e.target.checked)}
                        className="rounded"
                    />
                    Ny plante denne uken
                </label>
            </div>

            {/* Note */}
            <div className="flex flex-col gap-0.5">
                <label className="text-xs font-medium text-zinc-500">Notat</label>
                <textarea
                    value={draft.harvest_note}
                    onChange={(e) => set("harvest_note", e.target.value)}
                    rows={2}
                    placeholder="Ingen"
                    className="rounded border border-zinc-300 px-2 py-1.5 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-y"
                />
            </div>

            {/* Locations */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-500">Steder</span>
                    <button
                        onClick={addLocation}
                        className="text-xs text-blue-600 hover:text-blue-800">
                        + Legg til sted
                    </button>
                </div>
                {draft.locations.map((loc, i) => (
                    <LocationRow
                        key={i}
                        loc={loc}
                        onChange={(updated) => updateLocation(i, updated)}
                        onRemove={() => removeLocation(i)}
                    />
                ))}
                {draft.locations.length === 0 && (
                    <p className="text-xs text-zinc-400">Ingen steder registrert.</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap pt-1 border-t border-zinc-200">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40">
                    {saving ? "Lagrer…" : "Lagre"}
                </button>
                <button
                    onClick={onCancel}
                    className="rounded border border-zinc-200 bg-white px-4 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50">
                    Avbryt
                </button>
                <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="ml-auto rounded border border-red-200 bg-white px-4 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40">
                    {deleting ? "Sletter…" : "Slett"}
                </button>
            </div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function HarvestTable({ initialHarvests }: { initialHarvests: HarvestWithDetails[] }) {
    const [harvests, setHarvests] = useState(initialHarvests);
    const [done, setDone] = useState<Map<number, boolean>>(
        () => new Map(initialHarvests.map((h) => [h.id, h.is_done]))
    );
    const [pending, setPending] = useState<Set<number>>(new Set());
    const [editingId, setEditingId] = useState<number | null>(null);
    const [infoPlantId, setInfoPlantId] = useState<number | null>(null);
    const [plants, setPlants] = useState<PlantOption[]>([]);

    // Sync done state when initialHarvests changes (e.g. page re-render)
    useEffect(() => {
        setHarvests(initialHarvests);
        setDone(new Map(initialHarvests.map((h) => [h.id, h.is_done])));
    }, [initialHarvests]);

    async function loadPlants() {
        if (plants.length > 0) return;
        const res = await fetch("/api/plants");
        if (res.ok) {
            const data = (await res.json()) as PlantOption[];
            setPlants(data.sort((a, b) => a.name.localeCompare(b.name)));
        }
    }

    function openEdit(harvest: HarvestWithDetails) {
        setEditingId(harvest.id);
        loadPlants();
    }

    async function toggleDone(id: number) {
        if (pending.has(id)) return;
        const current = done.get(id) ?? false;
        setDone((prev) => new Map(prev).set(id, !current));
        setPending((prev) => new Set(prev).add(id));
        try {
            await fetch(`/api/harvests/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ is_done: !current }),
            });
        } finally {
            setPending((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    }

    async function handleSave(id: number, draft: EditDraft) {
        const parsedLocations = draft.locations.map((l) => ({
            address: l.address,
            position: l.position,
            boxes: l.boxes.trim()
                ? l.boxes
                      .split(/[\s,]+/)
                      .map(Number)
                      .filter((n) => n > 0)
                : null,
            location_note: l.location_note,
        }));

        const res = await fetch(`/api/harvests/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                year: draft.year,
                week: draft.week,
                plant_id: draft.plant_id,
                amount: draft.amount.trim() || null,
                harvest_note: draft.harvest_note.trim() || null,
                is_new: draft.is_new,
                locations: parsedLocations,
            }),
        });

        if (res.ok) {
            const plant = plants.find((p) => p.id === draft.plant_id);
            setHarvests((prev) =>
                prev.map((h) =>
                    h.id !== id
                        ? h
                        : {
                              ...h,
                              year: draft.year,
                              week: draft.week,
                              plant_id: draft.plant_id,
                              plant_name: plant?.name ?? h.plant_name,
                              amount: draft.amount.trim() || null,
                              harvest_note: draft.harvest_note.trim() || null,
                              is_new: draft.is_new,
                              locations: parsedLocations.map((l, i) => ({
                                  ...l,
                                  id: h.locations[i]?.id ?? -(i + 1),
                              })),
                          }
                )
            );
            setEditingId(null);
        }
    }

    async function handleDelete(id: number) {
        const res = await fetch(`/api/harvests/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 204) {
            setHarvests((prev) => prev.filter((h) => h.id !== id));
            setDone((prev) => {
                const next = new Map(prev);
                next.delete(id);
                return next;
            });
            setEditingId(null);
        }
    }

    if (harvests.length === 0)
        return (
            <p className="text-zinc-500 text-sm py-8 text-center">
                Ingen høsting registrert for denne uken.
            </p>
        );

    return (
        <>
            <PlantInfoModal plantId={infoPlantId} onClose={() => setInfoPlantId(null)} />
            <div
                className="rounded-lg border overflow-hidden bg-card"
                style={{ borderColor: "var(--color3)" }}>
                {/* Mobile header */}
                <div
                    className="sm:hidden grid grid-cols-[1fr_5rem] px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: "var(--color3)", color: "var(--text)" }}>
                    <div>Plante</div>
                    <div className="text-right">Høstet</div>
                </div>
                {/* Desktop header */}
                <div
                    className="hidden sm:grid px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{
                        gridTemplateColumns: "2fr minmax(8rem,1fr) 3fr 6rem",
                        backgroundColor: "var(--color3)",
                        color: "var(--text)",
                    }}>
                    <div>Plante</div>
                    <div>Mengde</div>
                    <div>Steder</div>
                    <div className="text-center">Høstet</div>
                </div>

                {harvests.map((harvest) => {
                    const isDone = done.get(harvest.id) ?? harvest.is_done;
                    const isPending = pending.has(harvest.id);
                    const isEditing = editingId === harvest.id;

                    return (
                        <div
                            key={harvest.id}
                            className="border-t-2"
                            style={{ borderColor: "var(--color3)" }}>
                            {isEditing ? (
                                <InlineEditForm
                                    harvest={harvest}
                                    plants={plants}
                                    onSave={(draft) => handleSave(harvest.id, draft)}
                                    onDelete={() => handleDelete(harvest.id)}
                                    onCancel={() => setEditingId(null)}
                                />
                            ) : (
                                <div className={`transition-opacity ${isDone ? "opacity-50" : ""}`}>
                                    {/* Mobile layout: name + buttons on same row, details below */}
                                    <div className="sm:hidden">
                                        <div className="flex items-center gap-2 px-3">
                                            <div className="flex-1 min-w-0 flex items-center gap-1.5 flex-wrap">
                                                <PlantIcon
                                                    category={harvest.plant_category}
                                                    onClick={() => setInfoPlantId(harvest.plant_id)}
                                                />
                                                <a
                                                    href={`/plants/${harvest.plant_id}`}
                                                    className="font-semibold text-zinc-900 text-sm hover:underline truncate"
                                                    title="Se planteside">
                                                    {harvest.plant_name}
                                                </a>
                                                {harvest.is_new && (
                                                    <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium leading-none shrink-0">
                                                        Ny
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <button
                                                    onClick={() => openEdit(harvest)}
                                                    title="Rediger"
                                                    className="text-zinc-400 hover:text-zinc-700 text-sm p-1">
                                                    ✎
                                                </button>
                                                <button
                                                    onClick={() => toggleDone(harvest.id)}
                                                    disabled={isPending}
                                                    className={`text-xs rounded px-2.5 py-1 font-medium transition-colors disabled:opacity-50 ${
                                                        isDone
                                                            ? "border border-zinc-300 bg-white text-zinc-400"
                                                            : "bg-green-600 text-white hover:bg-green-700"
                                                    }`}>
                                                    {isDone ? "✓" : "Høst"}
                                                </button>
                                            </div>
                                        </div>
                                        {(harvest.amount ||
                                            harvest.locations.length > 0 ||
                                            harvest.harvest_note) && (
                                            <div className="px-3 pb-1.5 text-xs text-zinc-700 space-y-0.5">
                                                {harvest.amount && (
                                                    <span className="mr-3">{harvest.amount}</span>
                                                )}
                                                {harvest.locations.map((loc) => {
                                                    const label: string[] = [];
                                                    if (loc.position)
                                                        label.push(
                                                            formatPosition(
                                                                loc.address,
                                                                loc.position
                                                            )
                                                        );
                                                    if (loc.boxes?.length)
                                                        label.push(`kasse ${loc.boxes.join(", ")}`);
                                                    if (loc.location_note)
                                                        label.push(loc.location_note);
                                                    const multiLoc = harvest.locations.length > 1;
                                                    const Elem = multiLoc ? "div" : "span";
                                                    return (
                                                        <Elem
                                                            key={loc.id}
                                                            className={`${
                                                                multiLoc ? "flex" : "inline-flex"
                                                            } items-center gap-1 mr-3`}>
                                                            <AddressBadge address={loc.address} />
                                                            {label.join(" · ")}
                                                        </Elem>
                                                    );
                                                })}
                                                {harvest.harvest_note && (
                                                    <span className="italic text-zinc-600">
                                                        {harvest.harvest_note}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Desktop grid layout */}
                                    <div
                                        className="hidden sm:grid"
                                        style={{
                                            gridTemplateColumns: "2fr minmax(8rem,1fr) 3fr 6rem",
                                        }}>
                                        {/* Plant name */}
                                        <div className="px-3 py-1.5 flex items-center gap-1.5">
                                            <PlantIcon
                                                category={harvest.plant_category}
                                                onClick={() => setInfoPlantId(harvest.plant_id)}
                                            />
                                            <a
                                                href={`/plants/${harvest.plant_id}`}
                                                className="font-semibold text-zinc-900 text-sm hover:underline"
                                                title="Se planteside">
                                                {harvest.plant_name}
                                            </a>
                                            {harvest.is_new && (
                                                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium leading-none self-center">
                                                    Ny
                                                </span>
                                            )}
                                        </div>

                                        {/* Amount */}
                                        <div className="px-3 py-1.5 text-sm text-zinc-800">
                                            {harvest.amount ?? (
                                                <span className="text-zinc-400">-</span>
                                            )}
                                        </div>

                                        {/* Locations + note */}
                                        <div
                                            className="px-3 py-1.5 border-l border-dashed flex flex-col justify-center"
                                            style={{ borderColor: "var(--color3)" }}>
                                            {harvest.harvest_note && (
                                                <div className="text-xs text-zinc-600 italic">
                                                    {harvest.harvest_note}
                                                </div>
                                            )}

                                            {harvest.locations.length > 0 ? (
                                                <ul className="space-y-0.5">
                                                    {harvest.locations.map((loc) => {
                                                        const label: string[] = [];
                                                        if (loc.position)
                                                            label.push(
                                                                formatPosition(
                                                                    loc.address,
                                                                    loc.position
                                                                )
                                                            );
                                                        if (loc.boxes?.length)
                                                            label.push(
                                                                `kasse ${loc.boxes.join(", ")}`
                                                            );
                                                        if (loc.location_note)
                                                            label.push(loc.location_note);
                                                        return (
                                                            <li
                                                                key={loc.id}
                                                                className="flex items-center gap-1 text-sm text-zinc-800">
                                                                <AddressBadge
                                                                    address={loc.address}
                                                                />
                                                                {label.join(" · ")}
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <span className="text-sm text-zinc-300">-</span>
                                            )}
                                        </div>

                                        {/* Done + edit */}
                                        <div
                                            className="px-3 py-1.5 border-l border-dashed flex items-center justify-center gap-2"
                                            style={{ borderColor: "var(--color3)" }}>
                                            <button
                                                onClick={() => openEdit(harvest)}
                                                title="Rediger"
                                                className="text-zinc-400 hover:text-zinc-700 text-sm leading-none p-1">
                                                ✎
                                            </button>
                                            <button
                                                onClick={() => toggleDone(harvest.id)}
                                                disabled={isPending}
                                                className={`text-xs rounded px-3 py-1.5 font-medium transition-colors disabled:opacity-50 ${
                                                    isDone
                                                        ? "border border-zinc-300 bg-white text-zinc-400 hover:bg-zinc-50"
                                                        : "bg-green-600 text-white hover:bg-green-700"
                                                }`}>
                                                {isDone ? "Ferdig" : "Høst"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );
}
