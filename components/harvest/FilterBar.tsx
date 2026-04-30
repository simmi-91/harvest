'use client';

import { useRouter } from 'next/navigation';

const YEARS = [2024, 2025, 2026];
const ADDRESSES = ['Ulvenpark', 'Ulven T'];
const POSITIONS = ['B', 'F', 'L', 'Tak', 'Åker', 'Bakke'];
const WEEKS = Array.from({ length: 52 }, (_, i) => i + 1);

interface FilterBarProps {
    year: number;
    week: number;
    address?: string;
    position?: string;
}

export function FilterBar({ year, week, address, position }: FilterBarProps) {
    const router = useRouter();

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
            if (v !== undefined && v !== '') params.set(k, v);
        });
        router.push(`/?${params.toString()}`);
    }

    return (
        <div className="flex flex-wrap gap-3 items-center">
            <select
                value={String(year)}
                onChange={(e) => navigate({ year: e.target.value })}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
                {YEARS.map((y) => (
                    <option key={y} value={y}>
                        {y}
                    </option>
                ))}
            </select>

            <select
                value={String(week)}
                onChange={(e) => navigate({ week: e.target.value })}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
                {WEEKS.map((w) => (
                    <option key={w} value={w}>
                        Uke {w}
                    </option>
                ))}
            </select>

            <select
                value={address ?? ''}
                onChange={(e) => navigate({ address: e.target.value || undefined })}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
                <option value="">Alle adresser</option>
                {ADDRESSES.map((a) => (
                    <option key={a} value={a}>
                        {a}
                    </option>
                ))}
            </select>

            <select
                value={position ?? ''}
                onChange={(e) => navigate({ position: e.target.value || undefined })}
                className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-400"
            >
                <option value="">Alle tak</option>
                {POSITIONS.map((p) => (
                    <option key={p} value={p}>
                        {p}
                    </option>
                ))}
            </select>
        </div>
    );
}
