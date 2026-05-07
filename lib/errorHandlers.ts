import { NextResponse } from 'next/server';

export function handleDatabaseError(error: unknown, conflictMessage?: string): Response {
    if (error instanceof Error && error.message.includes('unique')) {
        return NextResponse.json(
            { error: conflictMessage ?? 'A record with that combination already exists' },
            { status: 409 },
        );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
