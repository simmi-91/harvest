import { matchPlant } from '@/lib/plantMatcher';
import type { Plant, PlantAlias } from '@/types';

function makePlant(id: number, name: string): Plant {
    return { id, name, category: 'vegetable', harvest_instructions: null, tips: null, latin_name: null, image_url: null, created_at: '', updated_at: '' };
}

function makeAlias(id: number, alias: string, plant_id: number): PlantAlias {
    return { id, alias, plant_id };
}

const plants: Plant[] = [
    makePlant(1, 'Basilikum'),
    makePlant(2, 'Chili'),
    makePlant(3, 'Tomat'),
    makePlant(4, 'Gresskar'),
];

const aliases: PlantAlias[] = [
    makeAlias(1, 'chilli', 2),
    makeAlias(2, 'Basilicum', 1),
];

describe('matchPlant', () => {
    describe('exact match on plant name', () => {
        it('matches exact name case-sensitively', () => {
            const result = matchPlant('Basilikum', plants, []);
            expect(result).toEqual({ plant_id: 1, plant_name: 'Basilikum', uncertain: false, matched_alias: null });
        });

        it('matches exact name case-insensitively', () => {
            const result = matchPlant('basilikum', plants, []);
            expect(result).toEqual({ plant_id: 1, plant_name: 'Basilikum', uncertain: false, matched_alias: null });
        });

        it('matches with leading/trailing whitespace', () => {
            const result = matchPlant('  Chili  ', plants, []);
            expect(result).toEqual({ plant_id: 2, plant_name: 'Chili', uncertain: false, matched_alias: null });
        });
    });

    describe('exact match on alias', () => {
        it('matches alias case-insensitively', () => {
            const result = matchPlant('chilli', plants, aliases);
            expect(result).toEqual({ plant_id: 2, plant_name: 'Chili', uncertain: false, matched_alias: 'chilli' });
        });

        it('matches alias with different casing', () => {
            const result = matchPlant('CHILLI', plants, aliases);
            expect(result).toEqual({ plant_id: 2, plant_name: 'Chili', uncertain: false, matched_alias: 'chilli' });
        });

        it('resolves alias to correct plant', () => {
            const result = matchPlant('Basilicum', plants, aliases);
            expect(result?.plant_id).toBe(1);
            expect(result?.plant_name).toBe('Basilikum');
            expect(result?.matched_alias).toBe('Basilicum');
        });
    });

    describe('fuzzy match', () => {
        it('fuzzy matches a plant with one character difference', () => {
            const result = matchPlant('Basilikuum', plants, []);
            expect(result).not.toBeNull();
            expect(result?.plant_id).toBe(1);
            expect(result?.uncertain).toBe(true);
        });

        it('fuzzy matches with a single extra character', () => {
            const result = matchPlant('Tomaat', plants, []);
            expect(result?.plant_id).toBe(3);
            expect(result?.uncertain).toBe(true);
        });

        it('returns null when difference exceeds threshold', () => {
            const result = matchPlant('Zucchini', plants, []);
            expect(result).toBeNull();
        });
    });

    describe('no match', () => {
        it('returns null for empty plant list', () => {
            const result = matchPlant('Basilikum', [], []);
            expect(result).toBeNull();
        });

        it('returns null for completely unrelated name', () => {
            const result = matchPlant('XyzAbc123', plants, aliases);
            expect(result).toBeNull();
        });

        it('returns null when alias plant_id does not exist in plants', () => {
            const orphanAliases: PlantAlias[] = [makeAlias(99, 'GhostPlant', 999)];
            const result = matchPlant('GhostPlant', [], orphanAliases);
            expect(result).toBeNull();
        });
    });

    describe('priority', () => {
        it('prefers exact plant match over fuzzy alias match', () => {
            const result = matchPlant('Chili', plants, aliases);
            expect(result?.uncertain).toBe(false);
            expect(result?.matched_alias).toBeNull();
        });

        it('prefers exact alias match over fuzzy plant match', () => {
            const result = matchPlant('chilli', plants, aliases);
            expect(result?.uncertain).toBe(false);
            expect(result?.matched_alias).toBe('chilli');
        });
    });
});
