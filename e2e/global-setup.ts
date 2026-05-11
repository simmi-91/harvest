import { request } from '@playwright/test';

const BASE = 'http://localhost:3000';

export default async function globalSetup() {
    const ctx = await request.newContext({ baseURL: BASE });

    // Seed plants
    const tomatRes = await ctx.post('/api/plants', {
        data: { name: 'E2E Tomat', category: 'vegetable' },
    });
    const ruccolaRes = await ctx.post('/api/plants', {
        data: { name: 'E2E Ruccola', category: 'greens' },
    });

    if (!tomatRes.ok() || !ruccolaRes.ok()) {
        await ctx.dispose();
        return;
    }

    const tomat = await tomatRes.json() as { id: number };
    const ruccola = await ruccolaRes.json() as { id: number };

    // Seed harvests for week 19, 2026
    await ctx.post('/api/harvests', {
        data: {
            plant_id: tomat.id,
            year: 2026,
            week: 19,
            amount: '3 stk',
            locations: [{ address: 'Ulvenpark', position: 'B', boxes: [1, 2] }],
        },
    });

    await ctx.post('/api/harvests', {
        data: {
            plant_id: ruccola.id,
            year: 2026,
            week: 19,
            amount: 'Så mye du trenger',
            locations: [{ address: 'Ulven T', position: 'Tak' }],
        },
    });

    await ctx.dispose();
}
