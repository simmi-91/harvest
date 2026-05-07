'use client';

import { ADDRESS_BADGE_BG, getAddressBadgeLabel } from '@/lib/locationUtils';

export function AddressBadge({ address }: { address: string }) {
    const label = getAddressBadgeLabel(address);
    if (!label) return null;
    return (
        <span
            className="inline-flex items-center rounded px-1 pt-[2px] pb-px text-[9px] font-bold leading-none shrink-0"
            style={{ backgroundColor: ADDRESS_BADGE_BG[address], color: 'var(--text)' }}>
            {label}
        </span>
    );
}
