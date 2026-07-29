'use client';

interface SettingsTab {
    id: string;
    label: string;
}

interface Props {
    tabs: SettingsTab[];
    active: string;
    onChange: (id: string) => void;
}

export function SettingsTabs({ tabs, active, onChange }: Props) {
    return (
        <div className="flex border-b" style={{ borderColor: 'var(--color3)' }}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className="px-4 py-2 text-sm font-medium transition-colors cursor-pointer hover:bg-black/5"
                    style={{
                        color: active === tab.id ? 'var(--color6)' : 'var(--text)',
                        borderBottom: active === tab.id ? '2px solid var(--color6)' : '2px solid transparent',
                        marginBottom: '-1px',
                        opacity: active === tab.id ? 1 : 0.65,
                    }}
                >
                    {tab.label}
                </button>
            ))}
        </div>
    );
}
