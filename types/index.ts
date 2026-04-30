export type PlantCategory = 'vegetable' | 'herb' | 'flower' | 'seed';

export interface Plant {
    id: number;
    name: string;
    category: PlantCategory;
    harvest_instructions: string | null;
    tips: string | null;
    latin_name: string | null;
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
