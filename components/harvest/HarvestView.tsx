'use client';

import { useState } from 'react';
import React from 'react';
import { HarvestTable } from '@/components/harvest/HarvestTable';
import type { HarvestWithDetails } from '@/types';

interface HarvestViewProps {
    todayStr: string;
    currentWeek: number;
    initialHarvests: HarvestWithDetails[];
    year: number;
    week: number;
    children?: React.ReactNode;
}

export function HarvestView({ todayStr, currentWeek, initialHarvests, year, week, children }: HarvestViewProps) {
    const [editMode, setEditMode] = useState(false);

    return (
        <>
            <div className="flex items-stretch justify-between">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
                        Høstemelding
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text)' }}>
                        {todayStr} · uke {currentWeek}
                    </p>
                </div>
                <button
                    onClick={() => setEditMode((e) => !e)}
                    className={`text-xs transition-colors cursor-pointer text-right leading-tight self-center ${
                        editMode
                            ? 'text-zinc-700 font-medium'
                            : 'text-zinc-400 hover:text-zinc-600'
                    }`}>
                    {editMode ? (
                        <>
                            <span className="block">Avslutt</span>
                            <span className="block">redigering</span>
                        </>
                    ) : (
                        <>
                            <span className="block">Rediger</span>
                            <span className="block">innhold</span>
                        </>
                    )}
                </button>
            </div>
            {children}
            <HarvestTable
                initialHarvests={initialHarvests}
                year={year}
                week={week}
                editMode={editMode}
            />
        </>
    );
}
