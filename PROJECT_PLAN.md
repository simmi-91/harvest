# Harvest - Project Plan

## Overview

A new version of the harvest tracking app for Ulven Park community garden (samdyrkerlag). The main goal is to learn modern web technologies by rebuilding an existing app with a new stack.

### Core Features

1. **PDF upload with AI parsing**: Upload harvest reports directly, AI extracts structured data
2. **Harvest overview**: View what to harvest per week, filter by roof/location
3. **Plant info**: Harvest instructions and tips for each plant
4. **History**: Import older harvest reports

---

## Technology Stack

| Category  | Choice                  | Notes                              |
| --------- | ----------------------- | ---------------------------------- |
| Frontend  | Next.js 16 + TypeScript | App Router, Server Components      |
| Backend   | Next.js API Routes      | Same project, less boilerplate     |
| Database  | PostgreSQL              | JSONB support for flexible storage |
| AI        | Gemini API              | Free tier sufficient for use case  |
| Styling   | Tailwind CSS            | Included in Next.js setup          |
| Testing   | Jest + Playwright       | Unit tests and E2E tests           |
| API Docs  | Swagger/OpenAPI         | Auto-generated documentation       |
| Local Dev | Docker                  | PostgreSQL container               |

---

## Local Development Setup

### Prerequisites

-   Node.js 18+
-   Docker Desktop
-   WSL (Windows) or native Linux/macOS

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/harvest.git
cd harvest

# Start PostgreSQL container
docker-compose up -d

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Docker Compose

The `docker-compose.yml` file provides a PostgreSQL database for local development. This ensures all contributors have the same database setup.

```yaml
version: "3.8"

services:
    postgres:
        image: postgres:16
        container_name: harvest-postgres
        environment:
            POSTGRES_USER: harvest
            POSTGRES_PASSWORD: harvest_dev_password
            POSTGRES_DB: harvest
        ports:
            - "5433:5432"
        volumes:
            - postgres_data:/var/lib/postgresql/data
            - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
        healthcheck:
            test: ["CMD-SHELL", "pg_isready -U harvest"]
            interval: 5s
            timeout: 5s
            retries: 5

volumes:
    postgres_data:
```

---

## Database Schema

### ER Diagram (Conceptual)

```
plants ─────────────┬──────────────── plant_aliases
   │                │
   │                └── alias → plant_id
   │
   └── id
       │
harvests ───────────┼──────────────── harvest_locations
   │                │
   │ plant_id ──────┘                    │
   │                                     │
   └── id ───────────────────────────────┘
                                    harvest_id

location_aliases (standalone lookup table)
```

### SQL Schema

```sql
-- Plant categories
CREATE TYPE plant_category AS ENUM ('vegetable', 'herb', 'flower', 'seed');

-- Alias table for roof/location variants (Tak 1 → Tak B, etc.)
CREATE TABLE location_aliases (
  id SERIAL PRIMARY KEY,
  alias VARCHAR(50) NOT NULL UNIQUE,
  canonical_position VARCHAR(50) NOT NULL,
  canonical_address VARCHAR(50) NOT NULL
);

-- Plants with info from PDF plant pages
CREATE TABLE plants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  category plant_category DEFAULT 'vegetable',
  harvest_instructions TEXT,
  tips TEXT,
  latin_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Aliases for plant names (chili/chilli, pak choi/babyleaf pak choi)
CREATE TABLE plant_aliases (
  id SERIAL PRIMARY KEY,
  alias VARCHAR(100) NOT NULL UNIQUE,
  plant_id INT REFERENCES plants(id) ON DELETE CASCADE
);

-- Harvest data per week
CREATE TABLE harvests (
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
CREATE TABLE harvest_locations (
  id SERIAL PRIMARY KEY,
  harvest_id INT REFERENCES harvests(id) ON DELETE CASCADE,
  address VARCHAR(50) NOT NULL,
  position VARCHAR(50),
  boxes JSONB,
  location_note TEXT
);

-- Indexes for fast filtering
CREATE INDEX idx_harvests_year_week ON harvests(year, week);
CREATE INDEX idx_harvest_locations_address ON harvest_locations(address);
CREATE INDEX idx_harvest_locations_position ON harvest_locations(position);
CREATE INDEX idx_harvest_locations_boxes ON harvest_locations USING GIN (boxes);
```

### Location Aliases Seed Data

The harvest reports have used different naming conventions over the years:

```sql
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
('Begge tak', NULL, 'Ulvenpark');
```

---

## Project Structure

```
harvest/
├── app/                             # Next.js App Router
│   ├── layout.tsx                   # Root layout with navigation
│   ├── page.tsx                     # Home page (harvest overview)
│   ├── upload/
│   │   └── page.tsx                 # PDF upload and preview
│   ├── edit/
│   │   └── page.tsx                 # Edit harvest data
│   ├── plants/
│   │   ├── page.tsx                 # List of all plants
│   │   └── [id]/
│   │       └── page.tsx             # Single plant info
│   └── api/
│       ├── harvests/
│       │   ├── route.ts             # GET (list), POST (create)
│       │   └── [id]/
│       │       └── route.ts         # GET, PUT, DELETE (single)
│       ├── plants/
│       │   ├── route.ts
│       │   └── [id]/
│       │       └── route.ts
│       └── upload/
│           └── route.ts             # PDF parsing with Gemini
├── components/                      # React components
│   ├── layout/
│   │   ├── Navigation.tsx
│   │   └── Header.tsx
│   ├── harvest/
│   │   ├── HarvestGrid.tsx
│   │   ├── HarvestCard.tsx
│   │   └── FilterBar.tsx
│   ├── upload/
│   │   ├── PdfDropzone.tsx
│   │   ├── PreviewTable.tsx
│   │   └── UncertainField.tsx       # Yellow highlight for uncertain fields
│   └── plants/
│       └── PlantCard.tsx
├── lib/                             # Utility functions
│   ├── db.ts                        # PostgreSQL connection (pg)
│   ├── gemini.ts                    # Gemini API wrapper
│   ├── plantMatcher.ts              # Fuzzy matching for plant names
│   └── locationResolver.ts          # Lookup in location_aliases
├── types/                           # TypeScript types
│   └── index.ts
├── __tests__/                       # Jest unit tests
│   ├── lib/
│   │   └── plantMatcher.test.ts
│   └── api/
│       └── harvests.test.ts
├── e2e/                             # Playwright E2E tests
│   └── upload.spec.ts
├── scripts/                         # Database scripts
│   ├── init.sql                     # Database schema
│   └── seed.sql                     # Seed data
├── docker-compose.yml               # PostgreSQL for local development
├── jest.config.js
├── playwright.config.ts
├── .env.local                       # Environment variables (not committed)
├── .env.example                     # Example environment variables
└── README.md
```

---

## API Documentation (Swagger)

API documentation is auto-generated and available at `/api/docs` in development.

### Setup

```typescript
// app/api/docs/route.ts
import { createSwaggerSpec } from "next-swagger-doc";

const spec = createSwaggerSpec({
    apiFolder: "app/api",
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Harvest API",
            version: "3.0.0",
        },
    },
});
```

### Example Endpoint Documentation

```typescript
// app/api/harvests/route.ts

/**
 * @swagger
 * /api/harvests:
 *   get:
 *     summary: Get harvests
 *     parameters:
 *       - name: year
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *       - name: week
 *         in: query
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of harvests
 */
export async function GET(request: Request) {
    // ...
}
```

---

## Testing

### Unit Tests (Jest)

```bash
# Run unit tests
npm run test

# Run with coverage
npm run test:coverage
```

Example test:

```typescript
// __tests__/lib/plantMatcher.test.ts
import { findPlantMatch } from "@/lib/plantMatcher";

describe("findPlantMatch", () => {
    const plants = [
        { id: 1, name: "Chili" },
        { id: 2, name: "Basilikum" },
    ];

    it("finds exact match", () => {
        const result = findPlantMatch("Chili", plants, []);
        expect(result?.plantId).toBe(1);
        expect(result?.confidence).toBe(1.0);
    });

    it("finds fuzzy match for typo", () => {
        const result = findPlantMatch("Chilli", plants, []);
        expect(result?.plantId).toBe(1);
        expect(result?.confidence).toBeGreaterThan(0.9);
    });

    it("returns null for unknown plant", () => {
        const result = findPlantMatch("Banan", plants, []);
        expect(result).toBeNull();
    });
});
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

Example test:

```typescript
// e2e/upload.spec.ts
import { test, expect } from "@playwright/test";

test("upload PDF and see preview", async ({ page }) => {
    await page.goto("/upload");

    // Upload a test PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles("e2e/fixtures/test-harvest.pdf");

    // Wait for AI parsing
    await expect(page.locator('[data-testid="preview-table"]')).toBeVisible();

    // Check that plants are extracted
    await expect(page.locator("text=Oregano")).toBeVisible();
});
```

---

## AI Parsing

### Gemini Prompt

The AI extracts structured data from harvest report PDFs. Key challenges:

-   Location format varies between years (Tak 1 vs Tak B)
-   "Bednr" column can contain multiple locations
-   Plant names may have typos
-   Extra text in plant column (harvest tips)
-   Week numbers can be combined (28+29)

See `lib/gemini.ts` for the full prompt and parsing logic.

### Parsing Flow

```
[PDF uploaded]
       ↓
[Convert to base64]
       ↓
[Send to Gemini with structured prompt]
       ↓
[Gemini returns JSON with uncertainty flags]
       ↓
[Backend processes]
   │
   ├── For each harvest:
   │   ├── Look up position in location_aliases
   │   │   └── If not found: mark as uncertain
   │   │
   │   ├── Match plant_name against plants table
   │   │   ├── 100% match → link directly
   │   │   ├── >98% match → link automatically, log alias
   │   │   └── <98% match → mark as uncertain, return suggestions
   │   │
   │   └── Validate boxes (should be array of numbers)
   │
   └── For each plant_info_page:
       └── Save/update in plants table
       ↓
[Return to frontend with uncertainty flags]
       ↓
[Frontend shows preview]
   ├── Green fields: confident values
   ├── Yellow fields: uncertain values (user can edit)
   └── Red fields: missing data (user must fill in)
       ↓
[User approves/edits]
       ↓
[POST to /api/harvests with approved data]
       ↓
[Save to PostgreSQL]
```

### Fuzzy Matching for Plant Names

Uses Levenshtein distance to find similar plant names. See `lib/plantMatcher.ts`.

---

## Environment Variables

```env
# .env.example

# Database
DATABASE_URL=postgresql://harvest:harvest_dev_password@localhost:5433/harvest

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Deployment

### Server Setup

The app runs as a Node.js process managed by PM2, with Nginx as reverse proxy.

```
harvest.3lin.no → Nginx → PM2:Next.js:8030
```

### PM2 Configuration

```bash
# Start the app
cd /var/www/apps/harvest
pm2 start npm --name "harvest" -- start -- -p 8030
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name harvest.3lin.no;

    # SSL config...

    location / {
        proxy_pass http://localhost:8030;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
    push:
        branches: [main]

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: "20"
            - run: npm ci
            - run: npm run test
            - run: npm run build

    deploy:
        needs: test
        runs-on: ubuntu-latest
        steps:
            - name: Deploy to server
              uses: appleboy/ssh-action@master
              with:
                  host: ${{ secrets.SERVER_HOST }}
                  username: ${{ secrets.SERVER_USER }}
                  key: ${{ secrets.SSH_KEY }}
                  script: |
                      cd /var/www/apps/harvest
                      git pull origin main
                      npm ci
                      npm run build
                      pm2 restart harvest
```

---

## Implementation Phases

### Phase 1: Setup (1 day)

-   [ ] Create new repository
-   [ ] Initialize Next.js with TypeScript and Tailwind
-   [ ] Set up `docker-compose.yml` with PostgreSQL
-   [ ] Create database schema via `init.sql`
-   [ ] Seed location_aliases with known variants
-   [ ] Verify database connection
-   [ ] Set up Jest and Playwright configs

### Phase 2: Basic CRUD (2-3 days)

-   [ ] `/api/plants` - GET, POST
-   [ ] `/api/plants/[id]` - GET, PUT, DELETE
-   [ ] `/api/harvests` - GET (with year/week filter), POST
-   [ ] `/api/harvests/[id]` - GET, PUT, DELETE
-   [ ] Basic harvest overview on home page
-   [ ] Filter by week, year, roof, position
-   [ ] Write unit tests for API routes
-   [ ] Set up Swagger documentation

### Phase 3: PDF Upload (3-4 days)

-   [ ] `/upload` page with drag-and-drop
-   [ ] `/api/upload` route with Gemini integration
-   [ ] Preview component with color coding (green/yellow/red)
-   [ ] Fuzzy matching for plant names
-   [ ] Location alias lookup
-   [ ] Save after approval
-   [ ] Write tests for parsing logic

### Phase 4: Plant Info (1 day)

-   [ ] `/plants` list of all plants
-   [ ] `/plants/[id]` page with harvest instructions and tips
-   [ ] Import plant info from PDFs

### Phase 5: Polish (1-2 days)

-   [ ] Responsive design (mobile-friendly)
-   [ ] Loading states
-   [ ] Error handling
-   [ ] E2E tests for main flows
-   [ ] GitHub Actions for deployment

---

## Future Improvements

These features are not part of the initial release but may be added later:

-   **User accounts**: Google OAuth login, per-user harvest status (is_done moves to user_harvest_status table)
-   **Plant history**: Track which plants have been in which boxes over the years (useful for crop rotation)
-   **Statistics**: Count harvests per plant per season (note: amounts are free text like "a handful", not numbers)
-   **Images**: Upload photos of harvests

---

## Context: Why This Project Exists

This app tracks weekly harvest reports from Ulven Park community garden (samdyrkerlag) in Oslo. The garden coordinator publishes PDF reports each week listing what's ready to harvest, where to find it, and how much each household can take.

### Project Evolution

| Version | Year | Stack                            | Notes                                                              |
| ------- | ---- | -------------------------------- | ------------------------------------------------------------------ |
| v1      | 2023 | Vanilla JS + PHP PDO + MySQL     | First version. Simple CRUD with PHP scripts.                       |
| v2      | 2025 | Vite + React + PHP PDO + MySQL   | Learned React by rebuilding the frontend. Same PHP backend.        |
| v2.1    | 2025 | Same stack, refactored           | Rewrote most of the React code after taking Advanced React course. |
| v3      | 2026 | Next.js + PostgreSQL + Gemini AI | Full rebuild with modern stack. AI-powered PDF parsing.            |

Each version has been an opportunity to learn new technologies by solving a real problem I actually use.
