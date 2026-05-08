-- Plant categories
DO $$ BEGIN
    CREATE TYPE plant_category AS ENUM ('vegetable', 'greens', 'herb', 'flower', 'seed');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Alias table for roof/location variants (Tak 1 → Tak B, etc.)
CREATE TABLE IF NOT EXISTS location_aliases (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(50) NOT NULL UNIQUE,
    canonical_position VARCHAR(50),
    canonical_address VARCHAR(50) NOT NULL
);

-- Plants with info from PDF plant pages
CREATE TABLE IF NOT EXISTS plants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    category plant_category DEFAULT 'vegetable',
    harvest_instructions TEXT,
    tips TEXT,
    latin_name VARCHAR(100),
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Aliases for plant names (chili/chilli, pak choi/babyleaf pak choi)
CREATE TABLE IF NOT EXISTS plant_aliases (
    id SERIAL PRIMARY KEY,
    alias VARCHAR(100) NOT NULL UNIQUE,
    plant_id INT REFERENCES plants(id) ON DELETE CASCADE
);

-- Harvest data per week
CREATE TABLE IF NOT EXISTS harvests (
    id SERIAL PRIMARY KEY,
    plant_id INT REFERENCES plants(id) ON DELETE CASCADE,
    year INT NOT NULL,
    week INT NOT NULL,
    amount VARCHAR(100),
    harvest_note TEXT,
    is_new BOOLEAN DEFAULT FALSE,
    is_done BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(plant_id, year, week)
);

-- Locations per harvest (one harvest can have multiple locations)
CREATE TABLE IF NOT EXISTS harvest_locations (
    id SERIAL PRIMARY KEY,
    harvest_id INT REFERENCES harvests(id) ON DELETE CASCADE,
    address VARCHAR(50) NOT NULL,
    position VARCHAR(50),
    boxes JSONB,
    location_note TEXT
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_harvests_year_week ON harvests(year, week);
CREATE INDEX IF NOT EXISTS idx_harvest_locations_address ON harvest_locations(address);
CREATE INDEX IF NOT EXISTS idx_harvest_locations_position ON harvest_locations(position);
CREATE INDEX IF NOT EXISTS idx_harvest_locations_boxes ON harvest_locations USING GIN (boxes);

-- Location aliases: maps historical naming to canonical format
INSERT INTO location_aliases (alias, canonical_position, canonical_address) VALUES
-- Current format (2024+)
('Tak L', 'L', 'Ulvenpark'),
('Tak F', 'F', 'Ulvenpark'),
('Tak B', 'B', 'Ulvenpark'),
('Tak', 'Tak', 'Ulven T'),
('Åker', 'Åker', 'Ulven T'),
-- Older format (numbers)
('Tak 1', 'B', 'Ulvenpark'),
('Tak 2', 'F', 'Ulvenpark'),
('Tak 3', 'L', 'Ulvenpark'),
-- Special locations
('Bakke', 'Bakke', 'Ulvenpark'),
('BAKKE', 'Bakke', 'Ulvenpark'),
('bakke', 'Bakke', 'Ulvenpark'),
('Overalt', NULL, 'Ulvenpark'),
('overalt', NULL, 'Ulvenpark'),
('Begge tak', NULL, 'Ulvenpark')
ON CONFLICT (alias) DO NOTHING;
