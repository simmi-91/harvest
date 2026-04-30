import Link from 'next/link';

export function Navigation() {
    return (
        <nav className="border-b border-zinc-200 bg-white">
            <div className="max-w-4xl mx-auto px-4">
                <div className="flex h-14 items-center gap-8">
                    <Link href="/" className="font-semibold text-zinc-900 text-lg">
                        Høst
                    </Link>
                    <div className="flex gap-6 text-sm">
                        <Link href="/" className="text-zinc-600 hover:text-zinc-900 transition-colors">
                            Oversikt
                        </Link>
                        <Link href="/plants" className="text-zinc-600 hover:text-zinc-900 transition-colors">
                            Planter
                        </Link>
                        <Link href="/upload" className="text-zinc-600 hover:text-zinc-900 transition-colors">
                            Last opp
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}
