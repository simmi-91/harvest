import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import type { GeminiCombinedResult } from '@/types';

const plantCategory = z.enum(['vegetable', 'greens', 'herb', 'flower', 'seed']);

const GeminiLocationSchema = z.object({
    address: z.string().nullable(),
    position: z.string().nullable(),
    boxes: z.array(z.number()).nullable(),
    location_note: z.string().nullable(),
    uncertain: z.boolean(),
});

const GeminiEntrySchema = z.object({
    plant_name: z.string(),
    category: plantCategory.nullable(),
    amount: z.string().nullable(),
    harvest_note: z.string().nullable(),
    is_new: z.boolean(),
    locations: z.array(GeminiLocationSchema),
    uncertain: z.boolean(),
});

const GeminiCombinedResultSchema = z.object({
    year: z.number(),
    weeks: z.array(z.number()),
    harvest_entries: z.array(GeminiEntrySchema),
    plant_info: z.array(
        z.object({
            name: z.string(),
            latin_name: z.string().nullable(),
            category: plantCategory.nullable(),
            harvest_instructions: z.string().nullable(),
            tips: z.string().nullable(),
        }),
    ),
});

const DEFAULT_MODEL = 'gemini-3.1-flash';

export const GEMINI_MODELS = [
    { value: 'gemini-3.1-flash', label: 'Gemini 3.1 Flash' },
    { value: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
    { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image (Preview)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
] as const;

export type GeminiModel = typeof GEMINI_MODELS[number]['value'];

const PROMPT = `Du leser et høsterapport-PDF fra Ulven Park community garden i Oslo.
Rapporten inneholder TO typer sider:
1. HØSTETABELLER – tabeller med hvilke planter som er klare for høsting denne uken
2. PLANTEINFOSIDER – bildesider (fotografier/illustrasjoner) med info om enkeltplanter

Returner KUN gyldig JSON uten forklaring eller kommentarer.

JSON-skjema:
{
  "year": <heltall>,
  "weeks": [<heltall>, ...],
  "harvest_entries": [
    {
      "plant_name": "<navn>",
      "category": null | "seed",
      "is_new": <bool>,
      "amount": null | "<mengde>",
      "harvest_note": null | "<notat>",
      "uncertain": <bool>,
      "locations": [
        {
          "address": null | "Ulvenpark" | "Ulven T",
          "position": null | "<tak-referanse>",
          "boxes": null | [<heltall>, ...],
          "location_note": null | "<fritekst>",
          "uncertain": <bool>
        }
      ]
    }
  ],
  "plant_info": [
    {
      "name": "<plantenavn>",
      "latin_name": null | "<latinsk navn>",
      "category": "vegetable" | "greens" | "herb" | "flower" | "seed",
      "harvest_instructions": null | "<instruksjoner for høsting>",
      "tips": null | "<dyrkingstips>"
    }
  ]
}

=== REGLER FOR HØSTETABELLER (harvest_entries) ===

1. UKER: "Uke 20" → [20]. "Uke 28-30" → [28, 29, 30]. "Uke 28+29" → [28, 29].

2. PLANTENAVN:
   - Fjern "NY!" fra slutten og sett is_new: true
   - Fjern "Frø:" fra starten og sett category: "seed"
   - Notater i parentes etter plantenavn → harvest_note (f.eks. "(Kun i uke 28)" → "Kun i uke 28")

3. MENGDE: Hvis mengden inneholder "/" (f.eks. "5 stk / 10 stk", "En håndfull / To håndfuller"),
   betyr det enkeltandel / familieandel. Bruk KUN enkeltandelen (delen FØR skråstreken).
   Utvid alltid forkortelser: "SMDT" → "Så mye du trenger", "SMDV" → "Så mye du vil".
   Gjelder uansett om forkortelsen er i enkeltandel eller etter skråstrek.

4. BEDNUMMER (boxes):
   - "13-15" → [13, 14, 15]
   - "5+6" eller "5, 6" → [5, 6]
   - "29" → [29]
   - "Kasse 29" eller "Bed 29" → [29]

5. ADRESSER OG GYLDIGE POSISJONER:

   Ulvenpark:
   - Gyldige posisjoner: "Tak B", "Tak F", "Tak G", "Tak L" osv. (tak + stor bokstav = én av flere tak-seksjoner)
   - Kasser er identifisert med tall, f.eks. boxes: [18, 19]

   Ulven T:
   - Gyldige posisjoner: KUN "Tak" eller "Åker" – ingen bokstavssuffiks på posisjonen
   - Kasser på Ulven T kan være identifisert med bokstaver (F, D, osv.) – disse går i location_note, ikke position
   - "Tak F + D Ulven T" → address: "Ulven T", position: "Tak", location_note: "F + D"
   - "Åkeren på Ulven T" → address: "Ulven T", position: "Åker"

6. STEDSFORMATER:

   Format A – Seksjonsoverskrifter (2024):
   Tabellen er delt inn med overskrifter som "Tak L", "Tak F", "Ulvenpark", "Ulven T".
   Alle planter under en overskrift arver det stedet.
   "Begge tak" betyr position: null, address: "Ulvenpark".

   Format B – Gammelt format med Tak-nummer (2023):
   Kolonne "Bednr.", "Kasse nr." eller lignende med verdier som:
   - "Tak 1: 18, 19" → position: "Tak 1", boxes: [18, 19]
   - "Tak 2: 21, 22" → position: "Tak 2", boxes: [21, 22]
   - "Tak 1: 19/bakke" → to location-objekter: ett for "Tak 1" og ett med location_note: "bakke"
   - "bakke" → location_note: "bakke", address: "Ulvenpark"
   - "Overalt" → location_note: "Overalt", address: "Ulvenpark"

   Format C – Fullt format inline (2025):
   - "Tak B, bed 18 Ulvenpark" → address: "Ulvenpark", position: "Tak B", boxes: [18]
   - "I flere kasser på tak F" → address: "Ulvenpark", position: "Tak F", boxes: null, uncertain: true

   Format D – Kun kassenummer (tidlig 2023):
   Ingen tak-info, bare kassenummer → address: null, position: null, boxes: [<nummer>], uncertain: true

7. Tekster som "Overalt", "bakke" → location_note (ikke position).
   "Åker" og "Åkeren" er position-verdier KUN for Ulven T.
   "Tak X" med bokstav er position for Ulvenpark. For Ulven T er position alltid bare "Tak".

8. Sett uncertain: true for felter du er usikker på, eller hvis teksten er uklar.

9. Hvis en plante ikke har stedsinformasjon → locations: [].

=== REGLER FOR PLANTEINFOSIDER (plant_info) ===

9. Finn alle sider som er planteinfosider (ikke høstetabeller). Disse inneholder vanligvis:
   - Et bilde av planten
   - Plantenavn og eventuelt latinsk navn
   - Instruksjoner for høsting
   - Dyrkingstips eller annen nyttig info

10. For hver planteinfoside: ekstraher name, latin_name, category, harvest_instructions, tips.
   Sett felt til null hvis informasjonen ikke finnes på siden.
   category-regler: "vegetable" (rotvekster, kål, tomat, belgfrukter, osv.), "greens" (bladgrønnsaker som
   ruccola, bladkål, spinat, salat, mangold, osv.), "herb" (urter, krydder), "flower" (blomster,
   prydplanter), "seed" (frø som høstes som frø). Gjett ut fra plantetypen.

11. Hvis det ikke finnes planteinfosider i dokumentet → plant_info: [].`;

const RETRYABLE = [429, 503, 502, 504];
const MAX_RETRIES = 6;

function isRetryable(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    if (!RETRYABLE.some((code) => msg.includes(`[${code}`))) return false;
    // Daily quota exhaustion cannot be resolved by retrying
    if (msg.includes('RequestsPerDay') || msg.includes('PerDayPer')) return false;
    return true;
}

function retryDelayMs(err: unknown): number {
    // Check Retry-After header if the SDK exposes the response object on the error
    if (err && typeof err === 'object' && 'response' in err) {
        const retryAfter = (err as { response?: { headers?: Headers } }).response?.headers?.get?.('Retry-After');
        if (retryAfter) return parseInt(retryAfter) * 1000;
    }
    const msg = err instanceof Error ? err.message : String(err);
    const match = msg.match(/retryDelay["\s:]+(\d+)s/) || msg.match(/retry in ([\d.]+)s/i);
    if (match) return Math.ceil(parseFloat(match[1])) * 1000 + 500;
    return 0;
}

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function parseCombined(jpegBase64List: string[], model: GeminiModel = DEFAULT_MODEL): Promise<GeminiCombinedResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model });

    let lastError: unknown;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        if (attempt > 0) {
            const apiDelay = retryDelayMs(lastError);
            await sleep(apiDelay || 2 ** attempt * 1000);
        }
        try {
            const result = await geminiModel.generateContent([
                { text: PROMPT },
                ...jpegBase64List.map((data) => ({
                    inlineData: { data, mimeType: 'image/jpeg' as const },
                })),
            ]);

            const text = result.response.text();
            const jsonMatch =
                text.match(/```json\s*([\s\S]*?)\s*```/) ||
                text.match(/```\s*([\s\S]*?)\s*```/) ||
                text.match(/(\{[\s\S]*\})/);

            if (!jsonMatch) throw new Error('No JSON found in Gemini response');
            return GeminiCombinedResultSchema.parse(JSON.parse(jsonMatch[1])) as GeminiCombinedResult;
        } catch (err) {
            lastError = err;
            if (!isRetryable(err)) throw err;
        }
    }

    throw lastError;
}
