
// Constants and Utility functions for document processing

// Standard API and processing configuration
export const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
export const CLAUDE_MODEL = "claude-3-opus-20240229";
export const MAX_IMAGES_PER_REQUEST = 20; // Claude maximum per request

// Document formats that are accepted by the system
export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg'
];

// Check if an image format is supported
export const isImageFormatSupported = (fileType: string) => {
  return ['image/png', 'image/jpeg', 'image/jpg'].includes(fileType);
};

// Split imageUrls into batches of MAX_IMAGES_PER_REQUEST
export function splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
  if (!items || !items.length) return [];
  
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

// Create the prompt for Claude that's sent with each image batch
export function createClaudePrompt(): string {
  return `
# Mezőgazdasági dokumentum elemzési feladat

A feltöltött mezőgazdasági dokumentum(ok)ból (jellemzően egységes kérelem, támogatási igénylés, stb.) azonosíts és gyűjts ki meghatározott adatokat, majd strukturáld azokat a megadott formátumban.

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

\`\`\`json
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
    "evek": [], // A dokumentumban szereplő évek listája, pl. [2016, 2017, 2018, 2019, 2020]
    "kulturak": [
      {
        "nev": "",
        "kod": "",
        "adatok": [
          {"ev": 0, "terulet_ha": 0.0, "termesmenny_t": 0.0}
          // Minden adatot a dokumentumban szereplő évszámokkal adj meg
        ]
      }
    ],
    "osszesitesek": [
      {"ev": 0, "osszes_terulet_ha": 0.0, "osszes_termeny_t": 0.0}
      // Minden adatot a dokumentumban szereplő évszámokkal adj meg
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
}
\`\`\`

Ha bizonyos adatok nem találhatók a dokumentumban, hagyd üresen a megfelelő mezőket. 
Törekedj a legnagyobb pontosságra és alaposságra az adatok kinyerésében. 
Különösen figyelj a számadatok pontosságára, és a kultúrák/növények pontos nevére, hasznosítási kódjára.
`;
}
