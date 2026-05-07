import { NextResponse } from 'next/server';
import { pdfToJpegBase64 } from '@/lib/pdfToImages';

export async function POST(req: Request) {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const images = await pdfToJpegBase64(buffer);

        return NextResponse.json({
            pages: images.length,
            sizes_kb: images.map((b64) => Math.round((b64.length * 3) / 4 / 1024)),
            total_kb: Math.round(images.reduce((sum, b64) => sum + (b64.length * 3) / 4, 0) / 1024),
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        return NextResponse.json({ error: `PDF conversion failed: ${msg}` }, { status: 500 });
    }
}
