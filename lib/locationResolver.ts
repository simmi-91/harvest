import type { LocationAlias } from '@/types';

function normalize(s: string): string {
    return s.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function resolveLocation(
    aliases: LocationAlias[],
    rawPosition: string,
): { address: string; position: string | null } | null {
    const needle = rawPosition.trim();
    const needleNorm = normalize(needle);

    // Exact match first (case-sensitive, aliases include casing variants)
    const exact = aliases.find((a) => a.alias === needle);
    if (exact) return { address: exact.canonical_address, position: exact.canonical_position };

    // Normalized match: collapses whitespace and ignores case
    const norm = aliases.find((a) => normalize(a.alias) === needleNorm);
    if (norm) return { address: norm.canonical_address, position: norm.canonical_position };

    return null;
}
