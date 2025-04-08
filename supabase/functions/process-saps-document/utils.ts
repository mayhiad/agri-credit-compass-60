
// Constants
export const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
export const CLAUDE_MODEL = "claude-3-opus-20240229";
export const MAX_IMAGES_PER_REQUEST = 20;

/**
 * Checks if an image format is supported by Claude
 */
export function isImageFormatSupported(format: string): boolean {
  const supportedFormats = ['.jpg', '.jpeg', '.png'];
  return supportedFormats.some(fmt => format.toLowerCase().endsWith(fmt));
}

/**
 * Splits an array into batches of specified size
 */
export function splitIntoBatches<T>(array: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
}

/**
 * Creates a prompt for Claude to analyze SAPS documents
 */
export function createClaudePrompt(): string {
  return `
A következő feladat: a feltöltött mezőgazdasági dokumentum(ok)ból (jellemzően egységes kérelem, támogatási igénylés, stb.) azonosíts és gyűjts ki meghatározott adatokat, majd strukturáld azokat a megadott formátumban.

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
   - Minden elérhető korábbi évre (általában 5 évre visszamenőleg a tárgyévtől)
   - Mind a terület (ha), mind a termésmennyiség (tonna) adatai

4. Tárgyévi gazdálkodási adatokat:
   - Tervezett kultúrák/növények és azok területe
   - Hasznosítási kódok szerinti bontás (pl. KAL01, IND23 stb.)
   - Összesítő adatokat (szántóterület, állandó gyep, összes mezőgazdasági terület)

Az összegyűjtött adatokat két formátumban add vissza:

1. ELŐSZÖR strukturált szöveges formában az alábbi mintának megfelelően:

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

2. MÁSODJÁRA pedig valid JSON formátumban, a következő struktúrában:

{
  "adminisztracios_adatok": {
    "beado_nev": "",
    "beado_ugyfel_azonosito": "",
    "kerelmezo_ugyfel_azonosito": "",
    "iratazonosito": "",
    "beadas_idopont": "",
    "targyev": ""
  },
  "blokkazonositok": [
    {"kod": "", "terulet_ha": 0.0}
  ],
  "historikus_adatok": {
    "evek": [],
    "kulturak": [
      {
        "nev": "",
        "kod": "",
        "adatok": [
          {"ev": 0, "terulet_ha": 0.0, "termesmenny_t": 0.0}
        ]
      }
    ],
    "osszesitesek": [
      {"ev": 0, "osszes_terulet_ha": 0.0, "osszes_termeny_t": 0.0}
    ]
  },
  "targyevi_adatok": {
    "kulturak": [
      {"nev": "", "kod": "", "terulet_ha": 0.0, "szazalek": 0.0}
    ],
    "osszesitesek": {
      "szantoterület_ha": 0.0,
      "allando_gyep_ha": 0.0,
      "osszes_mezogazdasagi_terulet_ha": 0.0
    }
  }
}`;
}
