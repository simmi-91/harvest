import type { Plant, PlantAlias } from '@/types';

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}

const MAX_FUZZY_RATIO = 0.35; // allow up to 35% character difference

export interface MatchResult {
    plant_id: number;
    plant_name: string;
    uncertain: boolean;
    matched_alias: string | null;
}

export function matchPlant(
    rawName: string,
    plants: Plant[],
    aliases: PlantAlias[],
): MatchResult | null {
    const needle = rawName.trim().toLowerCase();

    // 1. Exact match on plant name
    const exactPlant = plants.find((p) => p.name.toLowerCase() === needle);
    if (exactPlant) return { plant_id: exactPlant.id, plant_name: exactPlant.name, uncertain: false, matched_alias: null };

    // 2. Exact match on alias
    const exactAlias = aliases.find((a) => a.alias.toLowerCase() === needle);
    if (exactAlias) {
        const plant = plants.find((p) => p.id === exactAlias.plant_id);
        if (plant) return { plant_id: plant.id, plant_name: plant.name, uncertain: false, matched_alias: exactAlias.alias };
    }

    // 3. Fuzzy match on plant names and aliases
    let bestScore = Infinity;
    let bestPlant: Plant | null = null;
    let bestAlias: string | null = null;

    for (const plant of plants) {
        const haystack = plant.name.toLowerCase();
        const dist = levenshtein(needle, haystack);
        const score = dist / Math.max(needle.length, haystack.length);
        if (score < bestScore) {
            bestScore = score;
            bestPlant = plant;
            bestAlias = null;
        }
    }

    for (const alias of aliases) {
        const haystack = alias.alias.toLowerCase();
        const dist = levenshtein(needle, haystack);
        const score = dist / Math.max(needle.length, haystack.length);
        if (score < bestScore) {
            bestScore = score;
            const plant = plants.find((p) => p.id === alias.plant_id);
            if (plant) { bestPlant = plant; bestAlias = alias.alias; }
        }
    }

    if (bestPlant && bestScore <= MAX_FUZZY_RATIO) {
        return { plant_id: bestPlant.id, plant_name: bestPlant.name, uncertain: true, matched_alias: bestAlias };
    }

    return null;
}
