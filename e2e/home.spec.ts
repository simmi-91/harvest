import { test, expect } from '@playwright/test';

const WEEK_URL = '/?year=2026&week=19';

test.describe('Home page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(WEEK_URL);
    });

    test('renders heading and harvest table', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Høstemelding' })).toBeVisible();
        await expect(page.getByRole('table')).toBeVisible();
    });

    test('shows both seeded plants in table', async ({ page }) => {
        await expect(page.getByText('E2E Tomat')).toBeVisible();
        await expect(page.getByText('E2E Ruccola')).toBeVisible();
    });

    test('address badges UP and UT are visible', async ({ page }) => {
        await expect(page.getByText('UP')).toBeVisible();
        await expect(page.getByText('UT')).toBeVisible();
    });

    test('filter by Ulvenpark shows only Ulvenpark entries', async ({ page }) => {
        await page.getByRole('button', { name: /Ulvenpark/ }).click();
        await expect(page.getByText('E2E Tomat')).toBeVisible();
        await expect(page.getByText('E2E Ruccola')).not.toBeVisible();
    });

    test('filter by Ulven T shows only Ulven T entries', async ({ page }) => {
        await page.getByRole('button', { name: /Ulven T/ }).click();
        await expect(page.getByText('E2E Ruccola')).toBeVisible();
        await expect(page.getByText('E2E Tomat')).not.toBeVisible();
    });

    test('scroll-to-top button appears after scrolling down', async ({ page }) => {
        const scrollBtn = page.getByRole('button', { name: /topp/i });
        await expect(scrollBtn).not.toBeVisible();

        await page.evaluate(() => window.scrollTo(0, 600));
        await expect(scrollBtn).toBeVisible();
    });

    test('scroll-to-top button scrolls back to top', async ({ page }) => {
        await page.evaluate(() => window.scrollTo(0, 600));
        await page.getByRole('button', { name: /topp/i }).click();
        await expect(page.evaluate(() => window.scrollY)).resolves.toBeLessThan(50);
    });
});
