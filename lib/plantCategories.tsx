import { Carrot, LeafyGreen, Sprout, Flower, Bean } from 'lucide-react';
import type { PlantCategory } from '@/types';

export const PLANT_CATEGORIES: {
    value: PlantCategory;
    label: string;
    icon: React.ElementType;
}[] = [
    { value: 'vegetable', label: 'Grønnsak', icon: Carrot },
    { value: 'greens', label: 'Bladgrønnsak', icon: LeafyGreen },
    { value: 'herb', label: 'Urt', icon: Sprout },
    { value: 'flower', label: 'Blomst', icon: Flower },
    { value: 'seed', label: 'Frø', icon: Bean },
];

export function PlantIcon({ category, size = 15, className = 'shrink-0 text-zinc-500', onClick }: {
    category: PlantCategory;
    size?: number;
    className?: string;
    onClick?: () => void;
}) {
    const entry = PLANT_CATEGORIES.find((c) => c.value === category);
    const Icon = entry?.icon ?? Carrot;
    if (onClick) {
        return (
            <button
                onClick={onClick}
                title="Vis planteinfo"
                className={`${className} cursor-pointer hover:text-zinc-800 transition-colors`}>
                <Icon size={size} />
            </button>
        );
    }
    return <Icon size={size} className={className} />;
}
