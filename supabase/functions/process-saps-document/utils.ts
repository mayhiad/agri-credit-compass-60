
// Shared utilities for SAPS document processing

// API constants
export const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
export const CLAUDE_MODEL = "claude-3-opus-20240229";
export const API_TIMEOUT = 300000; // 5 minutes
export const MAX_IMAGES_PER_REQUEST = 20; // Claude limitations for images per request

/**
 * Check if an image format is supported
 */
export function isImageFormatSupported(imagePath: string): boolean {
  const supportedFormats = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  return supportedFormats.some(format => imagePath.toLowerCase().endsWith(format));
}

/**
 * Split array into batches of specified size
 */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Create prompt for Claude with specific instructions for SAPS document
 */
export function createClaudePrompt(): string {
  return `
Kérlek elemezd az alábbi SAPS dokumentumot (Egységes Kérelem) és azonosítsd a következő adatokat:

1. Adminisztrációs alapadatokat:
   - Beadó neve (általában a dokumentum elején vagy fejlécben)
   - Beadó ügyfél-azonosító száma (általában 10 jegyű szám)
   - Kérelmező ügyfél-azonosító száma
   - Iratazonosító (általában 10 jegyű szám a dokumentum fejlécében vagy vonalkód mellett)
   - Egységes kérelem beadásának pontos időpontja (év/hónap/nap, óra:perc)
   - Meghatározott tárgyév (a kérelem melyik évre vonatkozik)

2. Blokkazonosítókat és méretüket:
   - Mezőgazdasági blokkok azonosítója (általában 8 karakteres, betűkből és számokból álló kód)
   - Minden blokkhoz tartozó terület mérete hektárban

3. Növénykultúrákat:
   - Milyen növényeket termeszt a gazdálkodó
   - Minden növényhez tartozó terület mérete hektárban
   - Hasznosítási kódok (pl. KAL01, UGA01 stb.)

A válaszodat JSON formátumban add meg, a következő struktúrában:

{
  "applicantName": "A beadó neve",
  "applicantId": "A beadó ügyfél-azonosító száma",
  "submitterId": "A kérelmező ügyfél-azonosító száma",
  "documentId": "Az iratazonosító szám",
  "submissionDate": "A beadás időpontja",
  "targetYear": "A kérelem tárgyéve",
  "blocks": [
    {"blockId": "Blokkazonosító", "size": terület hektárban},
    {"blockId": "Blokkazonosító", "size": terület hektárban}
  ],
  "cultures": [
    {"name": "Növény neve", "code": "Hasznosítási kód", "hectares": terület hektárban},
    {"name": "Növény neve", "code": "Hasznosítási kód", "hectares": terület hektárban}
  ]
}

Fontos: ha valamelyik adatot nem találod a dokumentumban, akkor az adott mezőt hagyd üresen ("") vagy null értékkel. A területeket mindig számként add meg (ne szövegként). Ha a dokumentum nem tartalmaz elegendő információt vagy nem SAPS dokumentum, akkor ezt is jelezd.
`;
}
