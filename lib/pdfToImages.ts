import { execFile } from 'child_process';
import { readFile, writeFile, rm, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Converts a PDF buffer to an array of base64-encoded JPEG strings (one per page)
 * using Ghostscript. Requires `gs` to be installed on the system.
 */
export async function pdfToJpegBase64(
    pdfBuffer: Buffer,
    density = 120,
    quality = 75,
): Promise<string[]> {
    const tmpDir = await mkdtemp(join(tmpdir(), 'harvest-pdf-'));
    const pdfPath = join(tmpDir, 'input.pdf');
    const outputPattern = join(tmpDir, 'page-%d.jpg');

    try {
        await writeFile(pdfPath, pdfBuffer);

        await execFileAsync('gs', [
            '-dNOPAUSE',
            '-dBATCH',
            '-dSAFER',
            '-sDEVICE=jpeg',
            `-r${density}`,
            `-dJPEGQ=${quality}`,
            `-sOutputFile=${outputPattern}`,
            pdfPath,
        ]);

        const images: string[] = [];
        for (let i = 1; ; i++) {
            try {
                const data = await readFile(join(tmpDir, `page-${i}.jpg`));
                images.push(data.toString('base64'));
            } catch {
                break; // no more pages
            }
        }

        return images;
    } finally {
        await rm(tmpDir, { recursive: true, force: true });
    }
}
