'use client';

import { useRef, useState } from 'react';

interface PdfDropzoneProps {
    onFile: (file: File) => Promise<void>;
    loading: boolean;
}

export function PdfDropzone({ onFile, loading }: PdfDropzoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    function handleFiles(files: FileList | null) {
        if (!files) return;
        const file = files[0];
        if (file?.type === 'application/pdf') onFile(file);
    }

    return (
        <div
            role="button"
            tabIndex={0}
            aria-label="Last opp PDF"
            onClick={() => !loading && inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && !loading && inputRef.current?.click()}
            onDragOver={(e) => {
                e.preventDefault();
                if (!loading) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (!loading) handleFiles(e.dataTransfer.files);
            }}
            className={[
                'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 sm:p-12 text-center cursor-pointer transition-colors',
                isDragging
                    ? 'border-zinc-500 bg-zinc-50'
                    : 'border-zinc-300 bg-white hover:border-zinc-400 hover:bg-zinc-50',
                loading ? 'opacity-60 cursor-not-allowed' : '',
            ]
                .filter(Boolean)
                .join(' ')}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
                disabled={loading}
            />
            {loading ? (
                <>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-700" />
                    <p className="text-sm text-zinc-500">Analyserer PDF med Gemini…</p>
                </>
            ) : (
                <>
                    <svg
                        className="h-10 w-10 text-zinc-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                    </svg>
                    <div>
                        <p className="text-sm font-medium text-zinc-700">
                            Dra og slipp PDF her
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">eller klikk for å velge fil</p>
                    </div>
                </>
            )}
        </div>
    );
}
