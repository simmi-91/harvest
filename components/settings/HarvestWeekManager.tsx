'use client';

import { useEffect, useRef, useState } from 'react';

interface WeekSummary {
    year: number;
    week: number;
    count: number;
}

function weekLabel(w: WeekSummary) {
    return `Uke ${w.week}, ${w.year}`;
}

function WeekCombobox({
    weeks,
    value,
    onChange,
}: {
    weeks: WeekSummary[];
    value: string;
    onChange: (key: string) => void;
}) {
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selected = value ? weeks.find((w) => `${w.year}-${w.week}` === value) : null;
    const inputDisplay = open ? search : (selected ? weekLabel(selected) : '');

    const filtered = weeks.filter((w) =>
        `uke ${w.week} ${w.year}`.includes(search.toLowerCase().trim())
    );

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
                setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    function select(w: WeekSummary) {
        onChange(`${w.year}-${w.week}`);
        setOpen(false);
        setSearch('');
    }

    return (
        <div ref={containerRef} className="relative">
            <input
                type="text"
                placeholder="Søk uke…"
                value={inputDisplay}
                onFocus={() => { setOpen(true); setSearch(''); }}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48 rounded border border-zinc-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
            {open && (
                <div className="absolute z-10 mt-1 w-full max-h-52 overflow-y-auto rounded border border-zinc-200 bg-white shadow-md">
                    {filtered.length === 0 && (
                        <p className="px-3 py-2 text-xs text-zinc-400">Ingen treff</p>
                    )}
                    {filtered.map((w) => (
                        <button
                            key={`${w.year}-${w.week}`}
                            type="button"
                            onClick={() => select(w)}
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-zinc-50 transition-colors"
                            style={{ color: 'var(--text)' }}
                        >
                            {weekLabel(w)}
                            <span className="ml-2 text-xs text-zinc-400">{w.count} innslag</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export function HarvestWeekManager() {
    const [weeks, setWeeks] = useState<WeekSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [openYear, setOpenYear] = useState<number | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ year: number; week: number } | null>(null);

    const [moveFrom, setMoveFrom] = useState('');
    const [moveToYear, setMoveToYear] = useState('');
    const [moveToWeek, setMoveToWeek] = useState('');
    const [moveError, setMoveError] = useState<string | null>(null);
    const [moving, setMoving] = useState(false);
    const [moveSuccess, setMoveSuccess] = useState(false);

    async function load() {
        const res = await fetch('/api/admin/harvest-weeks');
        if (res.ok) {
            const data: WeekSummary[] = await res.json();
            setWeeks(data);
            setOpenYear((prev) => prev ?? (data[0]?.year ?? null));
        }
        setLoading(false);
    }

    useEffect(() => { load(); }, []);

    async function handleDelete(year: number, week: number) {
        await fetch('/api/admin/harvest-weeks', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ year, week }),
        });
        setWeeks((prev) => prev.filter((w) => !(w.year === year && w.week === week)));
        setConfirmDelete(null);
    }

    async function handleMove(e: React.FormEvent) {
        e.preventDefault();
        setMoveError(null);
        setMoveSuccess(false);

        const [fromYear, fromWeek] = moveFrom.split('-').map(Number);
        const toYear = Number(moveToYear);
        const toWeek = Number(moveToWeek);

        if (!fromYear || !fromWeek || !toYear || !toWeek) {
            setMoveError('Fyll inn alle felt');
            return;
        }

        setMoving(true);
        const res = await fetch('/api/admin/harvest-weeks/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: { year: fromYear, week: fromWeek }, to: { year: toYear, week: toWeek } }),
        });

        if (res.status === 204) {
            setMoveSuccess(true);
            setMoveFrom('');
            setMoveToYear('');
            setMoveToWeek('');
            await load();
        } else if (res.status === 409) {
            const body = await res.json();
            setMoveError(
                `${body.conflicts} innslag i destinasjonsuka har samme plante som kildeuka – flytt blokkert.`
            );
        } else {
            const body = await res.json().catch(() => ({}));
            setMoveError(body.error ?? 'Noe gikk galt');
        }
        setMoving(false);
    }

    const fromEntry = moveFrom ? weeks.find((w) => `${w.year}-${w.week}` === moveFrom) : null;

    const byYear = weeks.reduce<Record<number, WeekSummary[]>>((acc, w) => {
        (acc[w.year] ??= []).push(w);
        return acc;
    }, {});
    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-lg border bg-card" style={{ borderColor: 'var(--color3)' }}>
                <div
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide rounded-t-lg"
                    style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}
                >
                    Flytt uke
                </div>
                <form onSubmit={handleMove} className="p-4 flex flex-col gap-3">
                    <div className="flex gap-2 flex-wrap items-end">
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-zinc-500">Fra</label>
                            <WeekCombobox
                                weeks={weeks}
                                value={moveFrom}
                                onChange={(key) => {
                                    setMoveFrom(key);
                                    if (key) {
                                        const [y, w] = key.split('-');
                                        setMoveToYear(y);
                                        setMoveToWeek(w);
                                    }
                                }}
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-zinc-500">Til – år</label>
                            <input
                                type="number"
                                placeholder="2026"
                                value={moveToYear}
                                onChange={(e) => setMoveToYear(e.target.value)}
                                className="w-24 rounded border border-zinc-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            />
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-xs text-zinc-500">Til – uke</label>
                            <input
                                type="number"
                                placeholder="30"
                                min={1}
                                max={53}
                                value={moveToWeek}
                                onChange={(e) => setMoveToWeek(e.target.value)}
                                className="w-20 rounded border border-zinc-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-400"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={moving || !moveFrom || !moveToYear || !moveToWeek}
                            className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            style={{ color: 'var(--text)' }}
                        >
                            {moving ? 'Flytter…' : 'Flytt'}
                        </button>
                    </div>
                    {fromEntry && (
                        <p className="text-xs text-zinc-500">
                            Flytter {fromEntry.count} innslag fra uke {fromEntry.week}, {fromEntry.year}.
                        </p>
                    )}
                    {moveError && <p className="text-sm text-red-600">{moveError}</p>}
                    {moveSuccess && <p className="text-sm text-green-700">Uke flyttet.</p>}
                </form>
            </div>

            <div className="rounded-lg border overflow-hidden bg-card" style={{ borderColor: 'var(--color3)' }}>
                <div
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ backgroundColor: 'var(--color3)', color: 'var(--text)' }}
                >
                    Uker med data
                </div>
                {loading && (
                    <p className="px-4 py-3 text-sm text-zinc-400">Laster…</p>
                )}
                {!loading && weeks.length === 0 && (
                    <p className="px-4 py-3 text-sm text-zinc-400">Ingen høstedata registrert.</p>
                )}
                {years.map((year) => {
                    const isOpen = openYear === year;
                    const yearWeeks = byYear[year];
                    return (
                        <div key={year} className="border-t" style={{ borderColor: 'var(--color3)' }}>
                            <button
                                onClick={() => setOpenYear(isOpen ? null : year)}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-sm font-medium hover:bg-black/5 transition-colors cursor-pointer"
                                style={{ color: 'var(--text)' }}
                            >
                                <span>{year}</span>
                                <span className="text-zinc-400 text-xs">
                                    {yearWeeks.length} uker{isOpen ? ' ▲' : ' ▼'}
                                </span>
                            </button>
                            {isOpen && (
                                <div className="divide-y divide-[var(--color3)]">
                                    {yearWeeks.map((w) => {
                                        const isConfirm =
                                            confirmDelete?.year === w.year && confirmDelete?.week === w.week;
                                        return (
                                            <div key={w.week} className="px-4 py-1.5 flex items-center gap-3 text-sm bg-black/[0.02]">
                                                <span className="flex-1 text-zinc-700">Uke {w.week}</span>
                                                <span className="text-zinc-400 text-xs">{w.count} innslag</span>
                                                {isConfirm ? (
                                                    <span className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs text-zinc-600">Slette alle {w.count}?</span>
                                                        <button
                                                            onClick={() => handleDelete(w.year, w.week)}
                                                            className="text-xs text-red-600 hover:text-red-800 font-medium"
                                                        >
                                                            Slett
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(null)}
                                                            className="text-xs text-zinc-400 hover:text-zinc-600"
                                                        >
                                                            Avbryt
                                                        </button>
                                                    </span>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDelete({ year: w.year, week: w.week })}
                                                        className="text-xs text-zinc-400 hover:text-red-600 shrink-0 transition-colors"
                                                    >
                                                        Slett
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
