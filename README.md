# Harvest

A web app for tracking weekly harvest reports from a community garden.

### Screenshots

<img src="screenshots/overview.png" alt="Page with harvest overview" width="500">
<img src="screenshots/plants.png" alt="Page listing all plants" width="500">
<img src="screenshots/upload-idle.png" alt="Upload page before file select" width="500">
<img src="screenshots/upload-data.png" alt="Upload page with parsed data" width="500">

## Tech Stack

-   Next.js 16 (App Router)
-   TypeScript
-   Tailwind CSS
-   PostgreSQL
-   Google Gemini API

## Development

```bash
# Install dependencies
npm install

# Start PostgreSQL (requires Docker)
docker-compose up -d

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Background

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for full project documentation including database schema, API design, and implementation phases.
