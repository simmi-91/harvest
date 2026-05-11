# CLAUDE.md

This file provides context for Claude Code when working on this project.

Ask me questions until you are 95% confident you understand exactly what I need. Don't make any assumptions.

Never run `git commit` unless explicitly asked to.

## Project Overview

Harvest is a web app for tracking weekly harvest reports from Ulven Park community garden (samdyrkerlag) in Oslo. Users upload PDF harvest reports, which are parsed by AI to extract structured data about what's ready to harvest, where to find it, and how much to take.

## Tech Stack

-   **Framework**: Next.js 16 with App Router
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS
-   **Database**: PostgreSQL with JSONB
-   **AI**: Google Gemini API for PDF parsing
-   **Testing**: Jest (unit), Playwright (E2E)
-   **API Docs**: Swagger/OpenAPI

## Project Structure

```
harvest/
├── app/                    # Next.js App Router pages and API routes
│   ├── api/               # API endpoints
│   │   ├── harvests/
│   │   ├── plants/
│   │   └── upload/
│   ├── upload/            # PDF upload page
│   ├── edit/              # Edit harvest data
│   ├── plants/            # Plant info pages
│   └── page.tsx           # Home (harvest overview)
├── components/            # React components
├── lib/                   # Utility functions
│   ├── db.ts             # PostgreSQL connection
│   ├── gemini.ts         # Gemini API wrapper
│   └── plantMatcher.ts   # Fuzzy matching
├── types/                 # TypeScript types
├── __tests__/            # Jest unit tests
├── e2e/                  # Playwright E2E tests
└── scripts/              # Database scripts
    ├── init.sql
    └── seed.sql
```

## Database

PostgreSQL running in Docker for local development:

```bash
docker-compose up -d
```

Main tables:

-   `plants` - Plant info (name, category, harvest instructions)
-   `plant_aliases` - Alternate spellings (chili/chilli)
-   `harvests` - Weekly harvest data (plant, week, year, amount)
-   `harvest_locations` - Locations per harvest (address, position, boxes as JSONB)
-   `location_aliases` - Mapping old formats to canonical names (Tak 1 → Tak B)

## Key Concepts

### Harvest Reports (PDFs)

-   Published weekly by garden coordinator
-   Contains tables with: plant name, location (roof/box), amount
-   Location format varies by year (Tak 1, Tak B, etc.)
-   Week numbers can be combined (28+29 = same data for both weeks)

### Location Structure

-   **Address**: Ulvenpark, Ulven T
-   **Position**: Tak B, Tak F, Tak L (Ulvenpark) or Tak, Åker (Ulven T)
-   **Boxes**: Array of box numbers, e.g., [1, 2, 3, 14]

### AI Parsing

-   Upload PDF → Convert to base64 → Send to Gemini
-   Gemini returns structured JSON with uncertainty flags
-   Frontend shows preview with color coding (green=confident, yellow=uncertain)
-   User approves/edits before saving

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Tests
npm run test          # Jest unit tests
npm run test:e2e      # Playwright E2E tests

# Database
docker-compose up -d  # Start PostgreSQL
npm run db:migrate    # Run migrations
```

## Environment Variables

Required in `.env.local`:

-   `DATABASE_URL` - PostgreSQL connection string
-   `GEMINI_API_KEY` - Google Gemini API key

## Code Conventions

-   Use TypeScript strict mode
-   Components in PascalCase
-   API routes follow REST conventions
-   Use Tailwind for styling (no CSS modules)
-   Prefer server components where possible
-   Client components marked with 'use client'

## Git Conventions

Use Conventional Commits for all commit messages:

Types: `feat` (new feature), `fix` (bug fix), `chore` (config/setup/dependencies), `docs` (documentation), `test` (tests)

Rules:

-   English only
-   Imperative form ("add" not "added")
-   Lowercase after type
-   No period at end
-   Keep under 72 characters

## Co-Authorship

When Claude generates substantial code for a commit,
include the co-author tag:

Co-Authored-By: Claude <noreply@anthropic.com>
