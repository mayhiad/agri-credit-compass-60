
// Utility functions for Claude processing

// Claude API constants
export const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
export const CLAUDE_MODEL = "claude-3-opus-20240229";
export const MAX_IMAGES_PER_REQUEST = 20; // Claude API limit

// Supported image formats by Claude API
const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Checks if an image URL has a supported file format
 */
export function isImageFormatSupported(imageUrl: string): boolean {
  // Check if URL ends with a supported format
  return SUPPORTED_IMAGE_FORMATS.some(format => 
    imageUrl.toLowerCase().endsWith(format)
  );
}

/**
 * Split array into batches of a specified size
 */
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Creates the prompt message for Claude AI
 */
export function createClaudePrompt(): string {
  return `A következő feladat: a feltöltött mezőgazdasági dokumentum(ok)ból (jellemzően egységes kérelem, támogatási igénylés, stb.) azonosíts és gyűjts ki meghatározott adatokat, majd strukturáld azokat a megadott formátumban.

A dokumentumban keresd és azonosítsd az alábbi információkat:

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

3. Korábbi évek termésadatait:
   - A kárenyhítési/biztosítási részekben vagy múltbeli adatok táblázatában található
   - Kultúránként/terményfajtánként bontva
   - Minden elérhető évre (általában 5 évre visszamenőleg)
   - Mind a terület (ha), mind a termésmennyiség (tonna) adatai

4. Tárgyévi gazdálkodási adatokat:
   - Tervezett kultúrák/növények és azok területe
   - Hasznosítási kódok szerinti bontás (pl. KAL01, IND23 stb.)
   - Összesítő adatokat (szántóterület, állandó gyep, összes mezőgazdasági terület)

Az adatokat az alábbi struktúrában várom:

# 1. Gazdasági adatok áttekintése

## 1.1 - Adminisztrációs adatok
- Beadó neve: 
- Beadó ügyfél-azonosító száma:
- Kérelmező ügyfél-azonosító száma:
- Iratazonosító:
- Egységes kérelem beadásának időpontja:
- Meghatározott tárgyév:

## 1.2 - Blokkazonosítók:
[Blokklistát ide, mérettel együtt (ha)]

## 1.3 - Histórikus adatok:

| Kultúra | [Év1] |  | [Év2] |  | [Év3] |  | [Év4] |  | [Év5] |  |
|---------|------|------|------|------|------|------|------|------|------|------|
|         | ha | t | ha | t | ha | t | ha | t | ha | t |
| [Kultúra1] | [érték] | [érték] | ... | ... | ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Összesen** | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] |

## 1.4 - Tárgyévi termelési adatok:
- [Kultúra1]: [terület] ha ([százalék]%)
- [Kultúra2]: [terület] ha ([százalék]%)
...

**Összesített területadatok:**
- Összes szántóterület: [terület] ha
- Állandó gyep: [terület] ha ([százalék]%)
- Összes mezőgazdasági terület: [terület] ha

Figyelj az alábbiakra:
- A dokumentum számos oldalból állhat (akár 20-50 oldal), minden releváns adatot keress meg
- Az adatok különböző részeken lehetnek, teljes pontossággal olvasd be őket
- Hasznosítási kódokra figyelj (pl. KAL01=Őszi búza, IND23=Napraforgó, KAL21=Kukorica, stb.)
- A növénykultúrák nevét mindig pontosan írd ki a kód mellett
- A kárenyhítési/biztosítási részekben találhatók a korábbi évek termésadatai
- A blokkazonosítók listája általában a "Területek összesítése blokkhasználat szerint" résznél található
- Számolj területi összesítéseket és ellenőrizd a konzisztenciát
- Ahol az adott évre vagy kultúrára nincs adat, használj "-" jelölést
- Ellenőrizd az adatok pontosságát (tizedesjegyek, mértékegységek)`;
}
