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
