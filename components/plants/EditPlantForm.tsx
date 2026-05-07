"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANT_CATEGORIES } from "@/lib/plantCategories";
import type { Plant, PlantCategory } from "@/types";

export function EditPlantForm({ plant }: { plant: Plant }) {
    const router = useRouter();
    const [name, setName] = useState(plant.name);
    const [category, setCategory] = useState<PlantCategory>(plant.category);
    const [latinName, setLatinName] = useState(plant.latin_name ?? "");
    const [instructions, setInstructions] = useState(plant.harvest_instructions ?? "");
    const [tips, setTips] = useState(plant.tips ?? "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        const res = await fetch(`/api/plants/${plant.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: name.trim() || plant.name,
                category,
                latin_name: latinName.trim() || null,
                harvest_instructions: instructions.trim() || null,
                tips: tips.trim() || null,
            }),
        });

        setSaving(false);

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            setError((body as { error?: string }).error ?? "Noe gikk galt");
            return;
        }

        setSuccess(true);
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Navn</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Kategori</label>
                <div className="flex flex-wrap gap-1.5">
                    {PLANT_CATEGORIES.map(({ value, label, icon: Icon }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setCategory(value)}
                            className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs transition-colors ${
                                category === value
                                    ? "border-zinc-700 bg-zinc-900 text-white"
                                    : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                            }`}>
                            <Icon size={12} />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Latinsk navn</label>
                <input
                    type="text"
                    value={latinName}
                    onChange={(e) => setLatinName(e.target.value)}
                    placeholder="Ingen"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Høsteinstruksjoner</label>
                <textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={5}
                    placeholder="Ingen instruksjoner"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-y"
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-zinc-700">Tips</label>
                <textarea
                    value={tips}
                    onChange={(e) => setTips(e.target.value)}
                    rows={4}
                    placeholder="Ingen tips"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-400 resize-y"
                />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
            {success && <p className="text-sm text-green-700">Lagret!</p>}

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-40">
                    {saving ? "Lagrer…" : "Lagre"}
                </button>
                <a
                    href="/plants"
                    className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                    Tilbake
                </a>
            </div>
        </form>
    );
}
