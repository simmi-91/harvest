export type PlantCategory = 'vegetable' | 'greens' | 'herb' | 'flower' | 'seed';

export interface Plant {
    id: number;
    name: string;
    category: PlantCategory;
    harvest_instructions: string | null;
    tips: string | null;
    latin_name: string | null;
    image_url: string | null;
    created_at: string;
    updated_at: string;
}

export interface HarvestLocation {
    id: number;
    harvest_id: number;
    address: string;
    position: string | null;
    boxes: number[] | null;
    location_note: string | null;
}

export interface Harvest {
    id: number;
    plant_id: number;
    year: number;
    week: number;
    amount: string | null;
    harvest_note: string | null;
    is_new: boolean;
    is_done: boolean;
    created_at: string;
    updated_at: string;
}

export interface HarvestWithDetails extends Harvest {
    plant_name: string;
    plant_category: PlantCategory;
    locations: Omit<HarvestLocation, 'harvest_id'>[];
}

export interface LocationAlias {
    id: number;
    alias: string;
    canonical_position: string | null;
    canonical_address: string;
}

export interface PlantAlias {
    id: number;
    alias: string;
    plant_id: number;
}

// Gemini parse result types
export interface GeminiLocation {
    address: string | null;
    position: string | null;
    boxes: number[] | null;
    location_note: string | null;
    uncertain: boolean;
}

export interface GeminiEntry {
    plant_name: string;
    category: PlantCategory | null;
    amount: string | null;
    harvest_note: string | null;
    is_new: boolean;
    locations: GeminiLocation[];
    uncertain: boolean;
}

export interface GeminiPlantInfo {
    name: string;
    latin_name: string | null;
    category: PlantCategory | null;
    harvest_instructions: string | null;
    tips: string | null;
}

export interface GeminiCombinedResult {
    year: number;
    weeks: number[];
    harvest_entries: GeminiEntry[];
    plant_info: GeminiPlantInfo[];
}

// Resolved types (after plant matching and location alias resolution)
export interface ResolvedLocation {
    address: string;
    position: string | null;
    boxes: number[] | null;
    location_note: string | null;
    uncertain: boolean;
}

export interface ResolvedEntry {
    plant_id: number | null;
    plant_name: string;
    raw_plant_name: string;
    category: PlantCategory | null;
    amount: string | null;
    harvest_note: string | null;
    is_new: boolean;
    locations: ResolvedLocation[];
    uncertain: boolean;
}

export interface ResolvedPlantInfo {
    plant_id: number | null;
    plant_name: string;
    raw_name: string;
    existing_category: PlantCategory | null;
    existing_latin_name: string | null;
    existing_harvest_instructions: string | null;
    existing_tips: string | null;
    new_latin_name: string | null;
    new_category: PlantCategory | null;
    new_harvest_instructions: string | null;
    new_tips: string | null;
    is_new: boolean;
    has_changes: boolean;
    uncertain: boolean;
}

export interface ParseResponse {
    year: number;
    weeks: number[];
    entries: ResolvedEntry[];
    plant_info: ResolvedPlantInfo[];
}

export type RouteContext = { params: Promise<{ id: string }> };

export type LocationInput = {
    address: string;
    position?: string;
    boxes?: number[];
    location_note?: string;
};
