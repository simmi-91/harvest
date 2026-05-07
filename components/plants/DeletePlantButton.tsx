'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeletePlantButtonProps {
    id: number;
    name: string;
}

export function DeletePlantButton({ id, name }: DeletePlantButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleDelete() {
        if (!confirm(`Slett ${name}?`)) return;
        setLoading(true);
        try {
            await fetch(`/api/plants/${id}`, { method: 'DELETE' });
            router.refresh();
        } finally {
            setLoading(false);
        }
    }

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="text-xs text-zinc-400 hover:text-red-600 disabled:opacity-40 transition-colors"
        >
            {loading ? 'Sletter…' : 'Slett'}
        </button>
    );
}
