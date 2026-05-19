export function getISOWeek(date: Date): { year: number; week: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week };
}

// On Monday (1) and Tuesday (2) show the previous week, since the new
// harvest report isn't published until mid-week.
export function getDisplayWeek(now = new Date()): { year: number; week: number } {
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 1 || dayOfWeek === 2) {
        const prev = new Date(now);
        prev.setDate(prev.getDate() - 7);
        return getISOWeek(prev);
    }
    return getISOWeek(now);
}
