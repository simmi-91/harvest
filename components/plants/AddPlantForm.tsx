"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PLANT_CATEGORIES } from "@/lib/plantCategories";
import type { PlantCategory } from "@/types";

export function AddPlantForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [category, setCategory] = useState<PlantCategory>("vegetable");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch("/api/plants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), category }),
            });
            const body = await res.json();
            if (!res.ok) {
                setError(body.error ?? "Noe gikk galt");
                return;
            }
            setName("");
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2 items-center">
                <input
                    type="text"
                    placeholder="Plantenavn"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="flex-1 min-w-[140px] rounded border border-zinc-300 px-3 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
                <button
                    type="submit"
                    disabled={loading || !name.trim()}
                    className="rounded bg-zinc-900 px-4 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed">
                    {loading ? "Legger til…" : "Legg til"}
                </button>
            </div>
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
            {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
    );
}
