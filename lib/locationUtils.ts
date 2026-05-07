export const ADDRESSES = ['Ulvenpark', 'Ulven T'] as const;

export const POSITIONS_BY_ADDRESS: Record<string, string[]> = {
    Ulvenpark: ['B', 'F', 'L', 'Bakke'],
    'Ulven T': ['Tak', 'Åker'],
};

export const ADDRESS_BADGE_BG: Record<string, string> = {
    Ulvenpark: 'var(--color3)',
    'Ulven T': 'var(--color1)',
};

export function formatPosition(address: string, position: string): string {
    return address === 'Ulvenpark' && /^[A-Z]$/.test(position) ? `Tak ${position}` : position;
}

export function getAddressBadgeLabel(address: string): string | null {
    if (address === 'Ulvenpark') return 'UP';
    if (address === 'Ulven T') return 'UT';
    return null;
}
