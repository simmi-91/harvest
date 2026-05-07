import { resolveLocation } from '@/lib/locationResolver';
import type { LocationAlias } from '@/types';

function makeAlias(alias: string, address: string, position: string | null): LocationAlias {
    return { id: 1, alias, canonical_address: address, canonical_position: position };
}

const aliases: LocationAlias[] = [
    makeAlias('Tak 1', 'Ulvenpark', 'Tak B'),
    makeAlias('Tak 2', 'Ulvenpark', 'Tak F'),
    makeAlias('Tak B', 'Ulvenpark', 'Tak B'),
    makeAlias('Åker', 'Ulven T', 'Åker'),
    makeAlias('ulven t tak', 'Ulven T', 'Tak'),
];

describe('resolveLocation', () => {
    describe('exact match', () => {
        it('resolves exact alias match', () => {
            const result = resolveLocation(aliases, 'Tak 1');
            expect(result).toEqual({ address: 'Ulvenpark', position: 'Tak B' });
        });

        it('resolves alias that is identical to canonical', () => {
            const result = resolveLocation(aliases, 'Tak B');
            expect(result).toEqual({ address: 'Ulvenpark', position: 'Tak B' });
        });

        it('resolves alias with null position', () => {
            const aliasesWithNull: LocationAlias[] = [makeAlias('Begge tak', 'Ulvenpark', null)];
            const result = resolveLocation(aliasesWithNull, 'Begge tak');
            expect(result).toEqual({ address: 'Ulvenpark', position: null });
        });
    });

    describe('normalized match (whitespace and casing)', () => {
        it('matches with different casing', () => {
            const result = resolveLocation(aliases, 'TAK 1');
            expect(result).toEqual({ address: 'Ulvenpark', position: 'Tak B' });
        });

        it('matches with extra whitespace', () => {
            const result = resolveLocation(aliases, 'Tak  1');
            expect(result).toEqual({ address: 'Ulvenpark', position: 'Tak B' });
        });

        it('matches with leading/trailing whitespace', () => {
            const result = resolveLocation(aliases, '  Åker  ');
            expect(result).toEqual({ address: 'Ulven T', position: 'Åker' });
        });

        it('matches lowercase alias', () => {
            const result = resolveLocation(aliases, 'ulven t tak');
            expect(result).toEqual({ address: 'Ulven T', position: 'Tak' });
        });
    });

    describe('no match', () => {
        it('returns null for empty alias list', () => {
            const result = resolveLocation([], 'Tak 1');
            expect(result).toBeNull();
        });

        it('returns null for unknown position', () => {
            const result = resolveLocation(aliases, 'Tak 99');
            expect(result).toBeNull();
        });

        it('returns null for empty string', () => {
            const result = resolveLocation(aliases, '');
            expect(result).toBeNull();
        });
    });
});
