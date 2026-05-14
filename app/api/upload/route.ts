import { NextResponse } from 'next/server';
import { asc } from 'drizzle-orm';
import { db } from '@/lib/db';
import { plants as plantsTable, plantAliases as plantAliasesTable, locationAliases as locationAliasesTable } from '@/lib/schema';
import { parseCombined, GEMINI_MODELS, type GeminiModel } from '@/lib/gemini';
import { pdfToJpegBase64 } from '@/lib/pdfToImages';
import { matchPlant } from '@/lib/plantMatcher';
import { resolveLocation } from '@/lib/locationResolver';
import type {
    Plant,
    PlantAlias,
    LocationAlias,
    GeminiEntry,
    GeminiLocation,
    ResolvedEntry,
    ResolvedLocation,
    ResolvedPlantInfo,
    ParseResponse,
} from '@/types';

function stripPlantNameAffixes(name: string): string {
    return name
        .replace(/^(urter|spiselige blomster)\s*:\s*/i, '')
        .replace(/\s+blomst$/i, '')
        .trim();
}

function normalizeFractions(text: string | null): string | null {
    if (!text) return text;
    return text
        .replace(/\b1\/4\b/g, '¼')
        .replace(/\b1\/2\b/g, '½')
        .replace(/\b3\/4\b/g, '¾')
        .replace(/\b1\/3\b/g, '⅓')
        .replace(/\b2\/3\b/g, '⅔');
}

export async function POST(req: Request) {
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const rawModel = formData.get('model');
    const model: GeminiModel = GEMINI_MODELS.some((m) => m.value === rawModel)
        ? (rawModel as GeminiModel)
        : GEMINI_MODELS[0].value;
    if (file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let images: string[];
    try {
        images = await pdfToJpegBase64(buffer);
        if (images.length === 0) throw new Error('Ghostscript produced no output');
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json(
            { error: `Failed to convert PDF to images: ${msg}. Is Ghostscript installed? (apt-get install ghostscript)` },
            { status: 500 },
        );
    }

    let parsed;
    try {
        parsed = await parseCombined(images, model);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `Failed to parse PDF: ${msg}` }, { status: 500 });
    }

    const [plantsRows, aliasRows, locAliasRows] = await Promise.all([
        db.select({
            id: plantsTable.id,
            name: plantsTable.name,
            category: plantsTable.category,
            harvest_instructions: plantsTable.harvest_instructions,
            tips: plantsTable.tips,
            latin_name: plantsTable.latin_name,
        }).from(plantsTable).orderBy(asc(plantsTable.name)),
        db.select({ id: plantAliasesTable.id, alias: plantAliasesTable.alias, plant_id: plantAliasesTable.plant_id }).from(plantAliasesTable),
        db.select({ id: locationAliasesTable.id, alias: locationAliasesTable.alias, canonical_position: locationAliasesTable.canonical_position, canonical_address: locationAliasesTable.canonical_address }).from(locationAliasesTable),
    ]);

    const plants = plantsRows as unknown as Plant[];
    const plantAliases = aliasRows as unknown as PlantAlias[];
    const locationAliases = locAliasRows as unknown as LocationAlias[];
    const plantById = new Map(plants.map((p) => [p.id, p]));

    const resolvedEntries: ResolvedEntry[] = parsed.harvest_entries.map((entry: GeminiEntry) => {
        const plantMatch = matchPlant(stripPlantNameAffixes(entry.plant_name), plants, plantAliases, entry.category);

        const resolvedLocations: ResolvedLocation[] = entry.locations.map(
            (loc: GeminiLocation) => {
                const resolved = loc.position ? resolveLocation(locationAliases, loc.position) : null;

                const address = resolved?.address ?? loc.address ?? 'Ulvenpark';
                const position = resolved?.position ?? (resolved ? null : loc.position);
                const locationUncertain = loc.uncertain || (!!loc.position && !resolved);

                return {
                    address,
                    position: position ?? null,
                    boxes: loc.boxes,
                    location_note: loc.location_note,
                    uncertain: locationUncertain,
                };
            },
        );

        const entryUncertain =
            entry.uncertain ||
            !plantMatch ||
            plantMatch.uncertain ||
            resolvedLocations.some((l) => l.uncertain);

        const aliasNote =
            plantMatch?.matched_alias &&
            plantMatch.matched_alias.toLowerCase() !== plantMatch.plant_name.toLowerCase()
                ? plantMatch.matched_alias
                : null;
        const harvest_note = aliasNote
            ? (entry.harvest_note ? `${entry.harvest_note} (${aliasNote})` : aliasNote)
            : entry.harvest_note;

        return {
            plant_id: plantMatch?.plant_id ?? null,
            plant_name: plantMatch?.plant_name ?? entry.plant_name,
            raw_plant_name: entry.plant_name,
            category: entry.category,
            amount: entry.amount,
            harvest_note,
            is_new: entry.is_new,
            locations: resolvedLocations,
            uncertain: entryUncertain,
        };
    });

    const mergedEntries: ResolvedEntry[] = [];
    const seenCertainPlantIds = new Map<number, ResolvedEntry>();
    for (const entry of resolvedEntries) {
        if (entry.plant_id !== null && !entry.uncertain) {
            const existing = seenCertainPlantIds.get(entry.plant_id);
            if (existing) {
                existing.locations = [...existing.locations, ...entry.locations];
            } else {
                seenCertainPlantIds.set(entry.plant_id, entry);
                mergedEntries.push(entry);
            }
        } else {
            mergedEntries.push(entry);
        }
    }

    const resolvedPlantInfo: ResolvedPlantInfo[] = [];
    for (const info of parsed.plant_info) {
        info.harvest_instructions = normalizeFractions(info.harvest_instructions);
        info.tips = normalizeFractions(info.tips);

        const match = matchPlant(stripPlantNameAffixes(info.name), plants, plantAliases, info.category);

        if (match) {
            const plant = plantById.get(match.plant_id);
            if (!plant) continue;

            const hasChanges =
                (info.latin_name !== null && info.latin_name !== plant.latin_name) ||
                (info.harvest_instructions !== null && info.harvest_instructions !== plant.harvest_instructions) ||
                (info.tips !== null && info.tips !== plant.tips);

            if (hasChanges) {
                resolvedPlantInfo.push({
                    plant_id: match.plant_id,
                    plant_name: match.plant_name,
                    raw_name: info.name,
                    existing_category: plant.category,
                    existing_latin_name: plant.latin_name,
                    existing_harvest_instructions: plant.harvest_instructions,
                    existing_tips: plant.tips,
                    new_latin_name: info.latin_name,
                    new_category: info.category,
                    new_harvest_instructions: info.harvest_instructions,
                    new_tips: info.tips,
                    is_new: false,
                    has_changes: true,
                    uncertain: match.uncertain,
                });
            }
        } else {
            resolvedPlantInfo.push({
                plant_id: null,
                plant_name: info.name,
                raw_name: info.name,
                existing_category: null,
                existing_latin_name: null,
                existing_harvest_instructions: null,
                existing_tips: null,
                new_latin_name: info.latin_name,
                new_category: info.category,
                new_harvest_instructions: info.harvest_instructions,
                new_tips: info.tips,
                is_new: true,
                has_changes: false,
                uncertain: false,
            });
        }
    }

    const response: ParseResponse = {
        year: parsed.year,
        weeks: parsed.weeks,
        entries: mergedEntries,
        plant_info: resolvedPlantInfo,
    };

    return NextResponse.json(response);
}
