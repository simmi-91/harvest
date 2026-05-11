import { NextResponse } from 'next/server';

function isUniqueViolation(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    const check = (e: unknown) =>
        e instanceof Error &&
        (e.message.includes('unique') || (e as { code?: string }).code === '23505');
    return check(error) || check((error as { cause?: unknown }).cause);
}

export function handleDatabaseError(error: unknown, conflictMessage?: string): Response {
    if (isUniqueViolation(error)) {
        return NextResponse.json(
            { error: conflictMessage ?? 'A record with that combination already exists' },
            { status: 409 },
        );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
