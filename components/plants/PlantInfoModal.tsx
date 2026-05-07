"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { PlantIcon, PLANT_CATEGORIES } from "@/lib/plantCategories";
import type { Plant } from "@/types";

export function PlantInfoModal({
    plantId,
    onClose,
}: {
    plantId: number | null;
    onClose: () => void;
}) {
    const [plant, setPlant] = useState<Plant | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (plantId === null) {
            setPlant(null);
            return;
        }
        setLoading(true);
        fetch(`/api/plants/${plantId}`)
            .then((r) => r.json())
            .then((data: Plant) => setPlant(data))
            .finally(() => setLoading(false));
    }, [plantId]);

    useEffect(() => {
        if (plantId === null) return;
        function onKey(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [plantId, onClose]);

    if (plantId === null) return null;

    const categoryLabel = plant
        ? (PLANT_CATEGORIES.find((c) => c.value === plant.category)?.label ?? plant.category)
        : null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(36,37,36,0.5)" }}
            onClick={onClose}>
            <div
                className="relative w-full max-w-lg rounded-xl overflow-y-auto shadow-xl max-h-[90dvh]"
                style={{ backgroundColor: "var(--color4)", borderColor: "var(--color3)" }}
                onClick={(e) => e.stopPropagation()}>

                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 rounded-full p-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-200 transition-colors">
                    <X size={18} />
                </button>

                {loading && (
                    <div className="flex items-center justify-center py-16 text-zinc-400 text-sm">
                        Laster…
                    </div>
                )}

                {!loading && plant && (
                    <div className="flex flex-col sm:flex-row">
                        {/* Image */}
                        <div className="sm:w-44 sm:shrink-0 bg-zinc-100">
                            {plant.image_url ? (
                                <img
                                    src={plant.image_url}
                                    alt={plant.name}
                                    className="w-full h-44 sm:h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-44 sm:h-full"
                                    style={{ backgroundColor: "var(--color3)" }}>
                                    <PlantIcon category={plant.category} size={40} className="text-white opacity-60" />
                                </div>
                            )}
                        </div>

                        {/* Text */}
                        <div className="flex-1 p-5 flex flex-col gap-3 min-w-0">
                            <div>
                                <h2 className="text-lg font-semibold text-zinc-900 pr-6">{plant.name}</h2>
                                {plant.latin_name && (
                                    <p className="text-sm italic text-zinc-500">{plant.latin_name}</p>
                                )}
                                {categoryLabel && (
                                    <span
                                        className="inline-block mt-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                        style={{ backgroundColor: "var(--color3)", color: "var(--text)" }}>
                                        {categoryLabel}
                                    </span>
                                )}
                            </div>

                            {plant.harvest_instructions && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                                        Høstinstruksjoner
                                    </p>
                                    <p className="text-sm text-zinc-800 leading-relaxed">
                                        {plant.harvest_instructions}
                                    </p>
                                </div>
                            )}

                            {plant.tips && (
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                                        Tips
                                    </p>
                                    <p className="text-sm text-zinc-800 leading-relaxed">{plant.tips}</p>
                                </div>
                            )}

                            {!plant.harvest_instructions && !plant.tips && (
                                <p className="text-sm text-zinc-400 italic">Ingen info registrert ennå.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
