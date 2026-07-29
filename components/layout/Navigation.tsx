'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';

const LINKS = [
    { href: '/', label: 'Oversikt' },
    { href: '/plants', label: 'Planter' },
    { href: '/upload', label: 'Last opp' },
];

export function Navigation() {
    const pathname = usePathname();
    const settingsActive = pathname.startsWith('/settings');

    return (
        <nav className="border-b" style={{ background: 'rgba(240, 238, 226, 0.9)', borderColor: 'var(--color3)' }}>
            <div className="flex h-12">
                {LINKS.map(({ href, label }) => {
                    const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
                    return (
                        <Link
                            key={href}
                            href={href}
                            className="flex-1 flex items-center justify-center text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-black/5"
                            style={{
                                color: active ? 'var(--color6)' : 'var(--color2)',
                                borderBottom: active ? '3px solid var(--color6)' : '3px solid transparent',
                            }}
                        >
                            {label}
                        </Link>
                    );
                })}
                <Link
                    href="/settings"
                    className="flex items-center gap-1.5 px-3 text-xs font-semibold uppercase tracking-widest transition-colors hover:bg-black/5"
                    style={{
                        color: settingsActive ? 'var(--color6)' : 'var(--color2)',
                        borderBottom: settingsActive ? '3px solid var(--color6)' : '3px solid transparent',
                    }}
                >
                    <Settings size={18} />
                    {settingsActive && 'Innstillinger'}
                </Link>
            </div>
        </nav>
    );
}
