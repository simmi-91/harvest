"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ADDRESSES } from "@/lib/locationUtils";
import { AddressBadge } from "@/components/shared/AddressBadge";

const SESSION_KEY = "harvest-filters";

const POSITIONS = ["B", "F", "L", "Tak", "Åker", "Bakke"];

const POSITION_TO_ADDRESS: Record<string, string> = {
    B: "Ulvenpark", F: "Ulvenpark", L: "Ulvenpark", Bakke: "Ulvenpark",
    Tak: "Ulven T", Åker: "Ulven T",
};

function positionLabel(p: string): string {
    return ["Tak", "Åker", "Bakke"].includes(p) ? p : `Tak ${p}`;
}

interface FilterBarProps {
    year: number;
    week: number;
    address?: string;
    position?: string;
    availableYears: number[];
    availableWeeks: number[];
    activeAddresses: string[];
    activePositions: string[];
}

export function FilterBar({ year, week, address, position, availableYears, availableWeeks, activeAddresses, activePositions }: FilterBarProps) {
    const router = useRouter();

    // Restore saved filters when landing on / without params
    useEffect(() => {
        if (window.location.search) return;
        const saved = sessionStorage.getItem(SESSION_KEY);
        if (saved) router.replace(`/?${saved}`);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    function navigate(updates: Record<string, string | undefined>) {
        const params = new URLSearchParams();
        const current: Record<string, string | undefined> = {
            year: String(year),
            week: String(week),
            address,
            position,
        };
        const merged = { ...current, ...updates };
        Object.entries(merged).forEach(([k, v]) => {
            if (v !== undefined && v !== "") params.set(k, v);
        });
        sessionStorage.setItem(SESSION_KEY, params.toString());
        router.push(`/?${params.toString()}`);
    }

    const selectClass = "rounded border border-zinc-300 bg-white px-2.5 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400";

    const pillBase = "inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-sm transition-colors";
    const pillActive = "border-zinc-700 bg-zinc-900 text-white";
    const pillInactive = "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50";

    return (
        <div className="flex flex-col gap-2.5">
            {/* Year + Week */}
            <div className="flex gap-2">
                <select
                    value={String(year)}
                    onChange={(e) => navigate({ year: e.target.value })}
                    className={selectClass}>
                    {availableYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>

                <select
                    value={String(week)}
                    onChange={(e) => navigate({ week: e.target.value })}
                    className={selectClass}>
                    {availableWeeks.map((w) => (
                        <option key={w} value={w}>Uke {w}</option>
                    ))}
                </select>
            </div>

            {/* Address pills */}
            <div className="flex flex-wrap gap-1.5">
                <button
                    onClick={() => navigate({ address: undefined, position: undefined })}
                    className={`${pillBase} ${!address ? pillActive : pillInactive}`}>
                    Alle steder
                </button>
                {ADDRESSES.map((a) => {
                    const isSelected = address === a;
                    const isAvailable = activeAddresses.includes(a);
                    return (
                        <button
                            key={a}
                            onClick={() => navigate({ address: isSelected ? undefined : a, position: undefined })}
                            className={`${pillBase} ${isSelected ? pillActive : pillInactive} ${!isAvailable ? "opacity-40" : ""}`}>
                            <AddressBadge address={a} />
                            {a}
                        </button>
                    );
                })}
            </div>

            {/* Position pills */}
            <div className="flex flex-wrap gap-1.5">
                <button
                    onClick={() => navigate({ position: undefined })}
                    className={`${pillBase} ${!position ? pillActive : pillInactive}`}>
                    Alle lokasjoner
                </button>
                {POSITIONS.map((p) => {
                    const addr = POSITION_TO_ADDRESS[p];
                    const isSelected = position === p;
                    const isAvailable = activePositions.includes(p);
                    return (
                        <button
                            key={p}
                            onClick={() => navigate({ position: isSelected ? undefined : p })}
                            className={`${pillBase} ${isSelected ? pillActive : pillInactive} ${!isAvailable ? "opacity-40" : ""}`}>
                            <AddressBadge address={addr} />
                            {positionLabel(p)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
