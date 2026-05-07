import {
    boolean,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
    unique,
    varchar,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const plantCategoryEnum = pgEnum('plant_category', ['vegetable', 'greens', 'herb', 'flower', 'seed']);

export const plants = pgTable('plants', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    category: plantCategoryEnum('category').default('vegetable'),
    harvest_instructions: text('harvest_instructions'),
    tips: text('tips'),
    latin_name: varchar('latin_name', { length: 100 }),
    image_url: varchar('image_url', { length: 500 }),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at').defaultNow(),
});

export const plantAliases = pgTable('plant_aliases', {
    id: serial('id').primaryKey(),
    alias: varchar('alias', { length: 100 }).notNull().unique(),
    plant_id: integer('plant_id').references(() => plants.id, { onDelete: 'cascade' }),
});

export const harvests = pgTable(
    'harvests',
    {
        id: serial('id').primaryKey(),
        plant_id: integer('plant_id').references(() => plants.id, { onDelete: 'cascade' }),
        year: integer('year').notNull(),
        week: integer('week').notNull(),
        amount: varchar('amount', { length: 100 }),
        harvest_note: text('harvest_note'),
        is_new: boolean('is_new').default(false),
        is_done: boolean('is_done').default(false),
        created_at: timestamp('created_at').defaultNow(),
        updated_at: timestamp('updated_at').defaultNow(),
    },
    (t) => [unique().on(t.plant_id, t.year, t.week)],
);

export const harvestLocations = pgTable('harvest_locations', {
    id: serial('id').primaryKey(),
    harvest_id: integer('harvest_id').references(() => harvests.id, { onDelete: 'cascade' }),
    address: varchar('address', { length: 50 }).notNull(),
    position: varchar('position', { length: 50 }),
    boxes: jsonb('boxes').$type<number[]>(),
    location_note: text('location_note'),
});

export const locationAliases = pgTable('location_aliases', {
    id: serial('id').primaryKey(),
    alias: varchar('alias', { length: 50 }).notNull().unique(),
    canonical_position: varchar('canonical_position', { length: 50 }),
    canonical_address: varchar('canonical_address', { length: 50 }).notNull(),
});

export const plantsRelations = relations(plants, ({ many }) => ({
    aliases: many(plantAliases),
    harvests: many(harvests),
}));

export const plantAliasesRelations = relations(plantAliases, ({ one }) => ({
    plant: one(plants, { fields: [plantAliases.plant_id], references: [plants.id] }),
}));

export const harvestsRelations = relations(harvests, ({ one, many }) => ({
    plant: one(plants, { fields: [harvests.plant_id], references: [plants.id] }),
    locations: many(harvestLocations),
}));

export const harvestLocationsRelations = relations(harvestLocations, ({ one }) => ({
    harvest: one(harvests, { fields: [harvestLocations.harvest_id], references: [harvests.id] }),
}));
