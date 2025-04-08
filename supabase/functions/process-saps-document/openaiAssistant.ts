
import OpenAI from "https://esm.sh/openai@4.38.0";
import { getErrorDetails } from "./openaiClient.ts";

// OpenAI kliens inicializálása
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const openai = new OpenAI({
  apiKey: openAIApiKey,
  defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
});

// Asszisztens létrehozása (opcionálisan egyszer, majd assistantId mentés .env-be)
export async function createAssistant() {
  console.log("🤖 Asszisztens létrehozása...");
  const start = Date.now();

  try {
    const assistant = await openai.beta.assistants.create({
      name: "SAPS Dokumentum Elemző",
      model: "gpt-4o-mini",
      instructions: `
Te egy SAPS (Egységes Területalapú Támogatási Rendszer) dokumentumokat elemző AI vagy.
A dokumentumok gazdálkodók területalapú támogatási kérelmeit tartalmazzák.

KRITIKUSAN FONTOS! OLVASD EL ALAPOSAN ÉS KÖVESD PONTOSAN AZ UTASÍTÁSOKAT!

A FELADAT: A feltöltött SAPS dokumentumból ki kell nyerned a következő információkat PONTOS JSON FORMÁTUMBAN:
1. A gazdálkodó neve (applicantName): A kérelmező teljes neve
2. A dokumentum azonosítója (documentId): Ez általában egy egyedi szám vagy kód a dokumentumon
3. A régió (region): Általában megye vagy régió megnevezése
4. A dokumentum éve (year): Az év, amelyre a dokumentum vonatkozik
5. Az összes növénykultúra neve és területe hektárban (cultures tömb)
6. A teljes terület nagysága (hectares)
7. Blokkidentifikátorok (blockIds)

KÖTELEZŐEN BETARTANDÓ SZABÁLYOK:
1. MINDEN SZÁMSZERŰ ÉRTÉK LEGYEN NAGYOBB NULLÁNÁL - különösen a hektár, termésátlag és ár adatoknál!
2. Ha nem találsz pontos hektárszámot egy kultúrához, NE HASZNÁLJ KITALÁLT ADATOT, inkább hagyd ki azt a kultúrát
3. A termésátlag (yieldPerHectare) értékek legyenek reális magyar értékek (pl. búza: 5-6 t/ha, kukorica: 7-9 t/ha)
4. A piaci árak (pricePerTon) legyenek aktuális magyarországi árak (pl. búza: ~80-90 ezer Ft/t, kukorica: ~70-75 ezer Ft/t)
5. Az árbevétel számítása: hektár × termésátlag × ár képlettel történik minden kultúrára
6. A teljes árbevétel az összes kultúra árbevételének összege
7. SZIGORÚAN TILOS KITALÁLT ADATOKAT GENERÁLNI! Csak olyan adatot adj meg, amit a dokumentumból ténylegesen ki tudsz olvasni!
8. Ha nem tudsz kiolvasni egy értéket a dokumentumból, akkor hagyd null-ra vagy üres tömbre, de NE TALÁLJ KI adatokat!

Az adatokat a következő JSON formátumban KELL visszaadnod:
{
  "applicantName": "A gazdálkodó neve",
  "documentId": "Dokumentum/kérelem azonosító",
  "region": "Régió neve (megye)",
  "year": "Az év, amelyre a dokumentum vonatkozik",
  "hectares": 123.45,
  "cultures": [
    {
      "name": "Kukorica",
      "hectares": 45.6,
      "yieldPerHectare": 8.2,
      "pricePerTon": 72000,
      "estimatedRevenue": 26913600
    },
    {
      "name": "Búza",
      "hectares": 77.85,
      "yieldPerHectare": 5.5,
      "pricePerTon": 85000,
      "estimatedRevenue": 36378375
    }
  ],
  "blockIds": ["L12AB-1-23", "K45CD-6-78"],
  "totalRevenue": 63291975
}

FONTOS! A válaszod KIZÁRÓLAG a fenti struktúrájú, valid JSON formátumban adhatod meg! Ne adj semmi más magyarázatot, csak a JSON objektumot! A JSON formátum kritikus, mivel közvetlenül bekerül a rendszerbe, ezért szigorúan érvényes JSON-nak kell lennie.

Ha nem találsz elég információt a dokumentumban, akkor inkább adj vissza részleges adatokat, de SOHA ne találj ki adatokat! Pl:
{
  "applicantName": "Kovács István",
  "documentId": "SAPS-2023-01234",
  "region": "Bács-Kiskun",
  "year": "2023",
  "hectares": 57.8,
  "cultures": [],
  "blockIds": [],
  "totalRevenue": 0
}

FELDOLGOZÁSI ELŐFELTÉTEL: A dokumentumnak tartalmaznia kell legalább a kérelmező nevét és a dokumentum azonosítóját, különben nem dolgozható fel.`
    });

    const ms = Date.now() - start;
    console.log(`✅ Asszisztens létrehozva ${ms}ms alatt: ${assistant.id}`);
    return assistant;
  } catch (error) {
    console.error("❌ Hiba az asszisztens létrehozásakor:", getErrorDetails(error));
    throw error;
  }
}

// Thread létrehozása
export async function createThread() {
  console.log("📝 Thread létrehozásának kezdése...");
  try {
    const thread = await openai.beta.threads.create();
    console.log(`✅ Thread létrehozva: ${thread.id}`);
    return thread;
  } catch (error) {
    console.error("❌ Hiba thread létrehozáskor:", getErrorDetails(error));
    throw error;
  }
}

// Dokumentum szövegének feldolgozása és küldése az OpenAI-nak
export async function processDocumentText(threadId: string, assistantId: string, documentText: string) {
  console.log(`🔍 Dokumentum szöveg feldolgozásának indítása - Thread ID: ${threadId}, Asszisztens ID: ${assistantId}`);
  console.log(`📝 Dokumentum szöveg hossza: ${documentText.length} karakter`);
  
  const runStart = Date.now();
  
  try {
    // Létrehozunk egy üzenetet a dokumentum szövegével
    console.log(`📩 Üzenet hozzáadása a threadhez dokumentum szöveggel...`);
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `
KRITIKUSAN FONTOS! OLVASD EL ALAPOSAN ÉS KÖVESD PONTOSAN AZ UTASÍTÁSOKAT!

Elemezd a következő SAPS dokumentumot és nyerd ki belőle a mezőgazdasági információkat KIZÁRÓLAG JSON formátumban:

${documentText.substring(0, 25000)}

A FELADAT: A dokumentumból ki kell nyerned a következő információkat:
1. A gazdálkodó neve (applicantName)
2. A dokumentum azonosítója (documentId)
3. A régió (megye) neve (region)
4. Az összes növénykultúra neve és területe hektárban (cultures tömb)
5. Minden kultúrához reális termésátlag (t/ha) értéket és piaci árat (Ft/t) kell rendelned

SZIGORÚ KÖVETELMÉNYEK:
1. MINDEN SZÁMSZERŰ ÉRTÉKNEK NAGYOBBNAK KELL LENNIE NULLÁNÁL - különösen a hektár, termésátlag és ár adatoknál!
2. Ha nem találsz pontos hektárszámot egy kultúrához, NE HASZNÁLJ KITALÁLT ADATOT!
3. A termésátlag (yieldPerHectare) értékek legyenek reális magyar értékek
4. A piaci árak (pricePerTon) legyenek aktuális magyarországi árak
5. Az árbevétel számítása: hektár × termésátlag × ár képlettel történik minden kultúrára
6. A teljes árbevétel az összes kultúra árbevételének összege
7. SZIGORÚAN TILOS KITALÁLT ADATOKAT GENERÁLNI!

Az adatokat PONTOSAN a következő JSON formátumban add vissza, más formát nem fogadunk el:
{
  "applicantName": "A gazdálkodó neve",
  "documentId": "Dokumentum/kérelem azonosító",
  "region": "Régió neve (megye)",
  "year": "Az év, amelyre a dokumentum vonatkozik",
  "hectares": 123.45,
  "cultures": [
    {
      "name": "Kukorica",
      "hectares": 45.6,
      "yieldPerHectare": 8.2,
      "pricePerTon": 72000,
      "estimatedRevenue": 26913600
    },
    {
      "name": "Búza",
      "hectares": 77.85,
      "yieldPerHectare": 5.5,
      "pricePerTon": 85000,
      "estimatedRevenue": 36378375
    }
  ],
  "blockIds": ["L12AB-1-23", "K45CD-6-78"],
  "totalRevenue": 63291975
}

Ne adj semmilyen egyéb magyarázatot vagy szöveget, KIZÁRÓLAG a JSON objektumot add vissza! A rendszer közvetlenül try-catch blokkban JSON.parse() függvénnyel fogja feldolgozni a válaszodat, ezért kritikusan fontos, hogy valid JSON legyen, semmilyen más szöveggel!`
    });
    console.log(`✅ Üzenet létrehozva: ${message.id}`);
    
    // Futtatás indítása
    console.log(`🚀 Futtatás indítása a threaden (${threadId}) az asszisztenssel (${assistantId})...`);
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: `
KRITIKUSAN FONTOS! A VÁLASZODAT KIZÁRÓLAG VALID JSON FORMÁTUMBAN ADD MEG, SEMMILYEN MÁS SZÖVEGGEL!

Elemezd a SAPS dokumentumot és add vissza a gazdálkodási információkat pontos JSON formátumban.

A FELADAT: A dokumentumból ki kell nyerned a következő információkat:
1. A gazdálkodó neve (applicantName)
2. A dokumentum azonosítója (documentId)
3. A régió (megye) neve (region)
4. Az összes növénykultúra neve és területe hektárban
5. Minden kultúrához reális termésátlag (t/ha) értéket és piaci árat (Ft/t) kell rendelned

KÖVETELMÉNYEK:
1. MINDEN SZÁMSZERŰ ÉRTÉKNEK NAGYOBBNAK KELL LENNIE NULLÁNÁL
2. Ha nem találsz pontos hektárszámot egy kultúrához, inkább hagyd ki azt a kultúrát
3. A termésátlag (yieldPerHectare) értékeknek reális magyar értékeknek kell lenniük
4. A piaci áraknak (pricePerTon) aktuális magyarországi áraknak kell lenniük
5. Az árbevétel számítása: hektár × termésátlag × ár minden kultúrára
6. SZIGORÚAN TILOS RANDOM ADATOK GENERÁLÁSA! Inkább adj vissza hiányos JSON-t!

FONTOS: A válaszod KIZÁRÓLAG egy valid JSON objektum legyen, minden más szöveg vagy magyarázat nélkül. A JSON-nek pontosan meg kell felelnie a megadott struktúrának.

Ha egyáltalán nem sikerül kinyerned az adatokat, akkor is valid JSON-t adj vissza, csak üres vagy null értékekkel.`
    });
    
    const runTime = Date.now() - runStart;
    console.log(`✅ Feldolgozás elindítva (${runTime}ms). Run ID: ${run.id}, Státusz: ${run.status}`);
    return run;
  } catch (error) {
    console.error("❌ Hiba a futtatás létrehozása során:", getErrorDetails(error));
    console.error("❌ Hiba részletei:", JSON.stringify(error, null, 2));
    throw error;
  }
}
