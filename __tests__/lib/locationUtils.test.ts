import { formatPosition, getAddressBadgeLabel } from '@/lib/locationUtils';

describe('formatPosition', () => {
    it('prefixes single uppercase letter with "Tak " for Ulvenpark', () => {
        expect(formatPosition('Ulvenpark', 'B')).toBe('Tak B');
    });

    it('does not prefix multi-character strings', () => {
        expect(formatPosition('Ulvenpark', 'BX')).toBe('BX');
    });

    it('does not prefix non-uppercase single letters', () => {
        expect(formatPosition('Ulvenpark', 'b')).toBe('b');
    });

    it('does not prefix named positions like Bakke', () => {
        expect(formatPosition('Ulvenpark', 'Bakke')).toBe('Bakke');
    });

    it('returns position unchanged for Ulven T', () => {
        expect(formatPosition('Ulven T', 'Tak')).toBe('Tak');
    });

    it('returns position unchanged for Ulven T with single letter', () => {
        expect(formatPosition('Ulven T', 'F')).toBe('F');
    });
});

describe('getAddressBadgeLabel', () => {
    it('returns "UP" for Ulvenpark', () => {
        expect(getAddressBadgeLabel('Ulvenpark')).toBe('UP');
    });

    it('returns "UT" for Ulven T', () => {
        expect(getAddressBadgeLabel('Ulven T')).toBe('UT');
    });

    it('returns null for unknown address', () => {
        expect(getAddressBadgeLabel('Ukjent')).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(getAddressBadgeLabel('')).toBeNull();
    });
});
