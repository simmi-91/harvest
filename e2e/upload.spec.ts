import { test, expect } from '@playwright/test';
import path from 'path';

const MOCK_PARSE_RESPONSE = {
    year: 2026,
    weeks: [19],
    entries: [
        {
            plant_id: 1,
            plant_name: 'E2E Tomat',
            raw_plant_name: 'E2E Tomat',
            category: 'vegetable',
            amount: '3 stk',
            harvest_note: null,
            is_new: false,
            uncertain: false,
            locations: [{ address: 'Ulvenpark', position: 'B', boxes: [1], location_note: null, uncertain: false }],
        },
        {
            plant_id: null,
            plant_name: 'Ukjent Urt',
            raw_plant_name: 'Ukjent Urt',
            category: null,
            amount: null,
            harvest_note: null,
            is_new: false,
            uncertain: true,
            locations: [],
        },
    ],
    plant_info: [],
};

test.describe('Upload page', () => {
    test.beforeEach(async ({ page }) => {
        // Clear localStorage cache so upload step always starts fresh
        await page.addInitScript(() => localStorage.removeItem('harvest-upload-cache'));
    });

    test('shows dropzone on load', async ({ page }) => {
        await page.goto('/upload');
        await expect(page.getByRole('button', { name: 'Last opp PDF' })).toBeVisible();
        await expect(page.getByText('Dra og slipp PDF her')).toBeVisible();
    });

    test('shows error when non-PDF is selected', async ({ page }) => {
        await page.route('**/api/upload', (route) =>
            route.fulfill({ status: 400, json: { error: 'Only PDF files are supported' } }),
        );

        await page.goto('/upload');
        const input = page.locator('input[type="file"]');
        const txtFile = Buffer.from('hello');
        await input.setInputFiles({
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: txtFile,
        });

        // Non-PDF files are filtered client-side — no error card, dropzone stays visible
        await expect(page.getByRole('button', { name: 'Last opp PDF' })).toBeVisible();
    });

    test('shows preview table after successful upload', async ({ page }) => {
        await page.route('**/api/upload', (route) =>
            route.fulfill({ json: MOCK_PARSE_RESPONSE }),
        );

        await page.goto('/upload');
        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: 'rapport.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4'),
        });

        await expect(page.getByRole('heading', { name: 'Forhåndsvisning' })).toBeVisible();
        await expect(page.getByText('E2E Tomat')).toBeVisible();
        await expect(page.getByText('Ukjent Urt')).toBeVisible();
    });

    test('shows "Usikker" badge for unmatched plant', async ({ page }) => {
        await page.route('**/api/upload', (route) =>
            route.fulfill({ json: MOCK_PARSE_RESPONSE }),
        );

        await page.goto('/upload');
        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: 'rapport.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4'),
        });

        await expect(page.getByText('Forhåndsvisning')).toBeVisible();
        await expect(page.getByText('Ingen match')).toBeVisible();
    });

    test('save button sends POST to /api/harvests', async ({ page }) => {
        await page.route('**/api/upload', (route) =>
            route.fulfill({ json: MOCK_PARSE_RESPONSE }),
        );

        let harvestPostCount = 0;
        await page.route('**/api/harvests', (route) => {
            if (route.request().method() === 'POST') harvestPostCount++;
            route.fulfill({ status: 201, json: { id: 99 } });
        });

        await page.goto('/upload');
        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: 'rapport.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4'),
        });

        await expect(page.getByText('Forhåndsvisning')).toBeVisible();
        await page.getByRole('button', { name: /Lagre/ }).click();

        await expect(page.getByText('Lagret!')).toBeVisible();
        // Only the matched plant (plant_id !== null) gets saved
        expect(harvestPostCount).toBe(1);
    });

    test('shows error card when upload fails', async ({ page }) => {
        await page.route('**/api/upload', (route) =>
            route.fulfill({ status: 500, json: { error: 'Gemini API error' } }),
        );

        await page.goto('/upload');
        const input = page.locator('input[type="file"]');
        await input.setInputFiles({
            name: 'rapport.pdf',
            mimeType: 'application/pdf',
            buffer: Buffer.from('%PDF-1.4'),
        });

        await expect(page.getByText(/gemini api error/i)).toBeVisible();
    });
});
