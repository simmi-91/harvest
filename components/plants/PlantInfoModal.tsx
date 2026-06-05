"use client";

import { useEffect, useRef, useState } from "react";
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
    const dialogRef = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        if (plantId === null) {
            setPlant(null);
            dialogRef.current?.close();
            return;
        }
        dialogRef.current?.showModal();
        setLoading(true);
        fetch(`/api/plants/${plantId}`)
            .then((r) => r.json())
            .then((data: Plant) => setPlant(data))
            .finally(() => setLoading(false));
    }, [plantId]);

    if (plantId === null) return null;

    const categoryLabel = plant
        ? (PLANT_CATEGORIES.find((c) => c.value === plant.category)?.label ?? plant.category)
        : null;

    return (
        <dialog
            ref={dialogRef}
            onCancel={onClose}
            onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
            className="w-full max-w-lg rounded-xl overflow-y-auto shadow-xl max-h-[90dvh] p-0 backdrop:bg-transparent"
            style={{ backgroundColor: "var(--color4)", borderColor: "var(--color3)" }}>

            <button
                onClick={onClose}
                aria-label="Lukk"
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
                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                                    Høstinstruksjoner
                                </h3>
                                <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                                    {plant.harvest_instructions}
                                </p>
                            </section>
                        )}

                        {plant.tips && (
                            <section>
                                <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                                    Tips
                                </h3>
                                <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                                    {plant.tips}
                                </p>
                            </section>
                        )}

                        {!plant.harvest_instructions && !plant.tips && (
                            <p className="text-sm text-zinc-400 italic">Ingen info registrert ennå.</p>
                        )}
                    </div>
                </div>
            )}
        </dialog>
    );
}
