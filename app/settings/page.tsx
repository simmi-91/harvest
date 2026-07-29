'use client';

import { useState } from 'react';
import { SettingsTabs } from '@/components/settings/SettingsTabs';
import { LocationAliasManager } from '@/components/settings/LocationAliasManager';
import { PlantAliasGlobalList } from '@/components/settings/PlantAliasGlobalList';
import { HarvestWeekManager } from '@/components/settings/HarvestWeekManager';

const TABS = [
    { id: 'locations', label: 'Stedsaliaser' },
    { id: 'plants', label: 'Plantealiaser' },
    { id: 'weeks', label: 'Høsteuker' },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('locations');

    return (
        <main className="max-w-2xl mx-auto px-4 py-2 sm:py-4 w-full">
            <div className="flex flex-col gap-4">
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text)' }}>
                    Innstillinger
                </h1>
                <SettingsTabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
                {activeTab === 'locations' && <LocationAliasManager />}
                {activeTab === 'plants' && <PlantAliasGlobalList />}
                {activeTab === 'weeks' && <HarvestWeekManager />}
            </div>
        </main>
    );
}
