import { getDisplayWeek, getISOWeek } from '@/lib/weekUtils';

describe('getISOWeek', () => {
    it('returns correct week for a known date', () => {
        expect(getISOWeek(new Date('2026-05-19'))).toEqual({ year: 2026, week: 21 });
    });

    it('handles year boundary — last week of year', () => {
        expect(getISOWeek(new Date('2025-12-29'))).toEqual({ year: 2026, week: 1 });
    });
});

describe('getDisplayWeek', () => {
    it('returns current week on Wednesday', () => {
        // 2026-05-20 is a Wednesday, ISO week 21
        const result = getDisplayWeek(new Date('2026-05-20'));
        expect(result).toEqual({ year: 2026, week: 21 });
    });

    it('returns current week on Thursday', () => {
        const result = getDisplayWeek(new Date('2026-05-21'));
        expect(result).toEqual({ year: 2026, week: 21 });
    });

    it('returns current week on Friday', () => {
        const result = getDisplayWeek(new Date('2026-05-22'));
        expect(result).toEqual({ year: 2026, week: 21 });
    });

    it('returns current week on Saturday', () => {
        const result = getDisplayWeek(new Date('2026-05-23'));
        expect(result).toEqual({ year: 2026, week: 21 });
    });

    it('returns current week on Sunday', () => {
        const result = getDisplayWeek(new Date('2026-05-24'));
        expect(result).toEqual({ year: 2026, week: 21 });
    });

    it('returns previous week on Monday', () => {
        // 2026-05-25 is Monday week 22 → should show week 21
        const result = getDisplayWeek(new Date('2026-05-25'));
        expect(result).toEqual({ year: 2026, week: 21 });
    });

    it('returns previous week on Tuesday', () => {
        // 2026-05-26 is Tuesday week 22 → should show week 21
        const result = getDisplayWeek(new Date('2026-05-26'));
        expect(result).toEqual({ year: 2026, week: 21 });
    });

    it('returns week 1 on Monday of week 2 at year start', () => {
        // 2026-01-05 is Monday of ISO week 2 → should show week 1
        const result = getDisplayWeek(new Date('2026-01-05'));
        expect(result).toEqual({ year: 2026, week: 1 });
    });
});
