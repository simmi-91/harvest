const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    process.exit(1);
}

const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
);

if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    process.exit(1);
}

const data = await res.json() as { models: { name: string; supportedGenerationMethods: string[] }[] };

const generateModels = data.models
    .filter((m) => m.supportedGenerationMethods.includes('generateContent'))
    .map((m) => m.name.replace('models/', ''));

console.log('Models supporting generateContent:');
generateModels.forEach((name) => console.log(` - ${name}`));
