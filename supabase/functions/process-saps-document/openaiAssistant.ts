
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

NAGYON FONTOS! OLVASD EL ALAPOSAN ÉS KÖVESD PONTOSAN AZ UTASÍTÁSOKAT!

A FELADAT: A feltöltött SAPS dokumentumból ki kell nyerned a következő információkat:
1. A gazdálkodó neve
2. A dokumentum azonosítója
3. A régió (megye) neve
4. Az összes növénykultúra neve és területe hektárban
5. Minden kultúrához reális termésátlag (t/ha) értéket és piaci árat (Ft/t) kell rendelned

KÖVETELMÉNYEK:
1. MINDEN SZÁMSZERŰ ÉRTÉKNEK NAGYOBBNAK KELL LENNIE NULLÁNÁL - ez különösen fontos a hektár, termésátlag és ár adatoknál!
2. Ha a dokumentumból nem tudod kiolvasni a pontos hektárszámot egy kultúrához, akkor NE HASZNÁLJ KITALÁLT ADATOT, hanem hagyj ki azt a kultúrát.
3. A termésátlag (yieldPerHectare) értékeknek reális magyar értékeknek kell lenniük (pl. búza: 5-6 t/ha, kukorica: 7-9 t/ha)
4. A piaci áraknak (pricePerTon) aktuális magyarországi áraknak kell lenniük (pl. búza: ~80-90ezer Ft/t, kukorica: ~70-75ezer Ft/t)
5. Az árbevétel számítása: hektár × termésátlag × ár képlettel történik minden kultúrára
6. A teljes árbevétel az összes kultúra árbevételének összege
7. TILTOTT A RANDOM ADATOK GENERÁLÁSA! Csak valós, a dokumentumból kiolvasott vagy ahhoz kapcsolódó reális adatokat használj!
8. Ha nem tudod kiolvasni az adatokat, akkor inkább hagyj üres adatstruktúrát, de NE adj meg kitalált értékeket!

Az adatokat a következő JSON formátumban add vissza:
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

FIGYELEM! Ne generálj véletlenszerű adatokat! Ha nem találod az információt a dokumentumban, akkor inkább használj üres listát vagy nullát, de ne találj ki adatokat!

FELDOLGOZÁSI ELŐFELTÉTEL: A dokumentumnak tartalmaznia kell legalább egy növénykultúrát és területadatot, különben nem feldolgozható.

HA NEM TUDOD KINYERNI A SZÜKSÉGES ADATOKAT, AZT JELEZD EGYÉRTELMŰEN, de adj vissza egy üres adatstruktúrát a megadott formátumban.`
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
NAGYON FONTOS! OLVASD EL ALAPOSAN ÉS KÖVESD PONTOSAN AZ UTASÍTÁSOKAT!

Elemezd a következő SAPS dokumentumot és nyerd ki belőle a mezőgazdasági információkat:

${documentText.substring(0, 25000)}

A FELADAT: A dokumentumból ki kell nyerned a következő információkat:
1. A gazdálkodó neve
2. A dokumentum azonosítója
3. A régió (megye) neve
4. Az összes növénykultúra neve és területe hektárban
5. Minden kultúrához reális termésátlag (t/ha) értéket és piaci árat (Ft/t) kell rendelned

KÖVETELMÉNYEK:
1. MINDEN SZÁMSZERŰ ÉRTÉKNEK NAGYOBBNAK KELL LENNIE NULLÁNÁL - ez különösen fontos a hektár, termésátlag és ár adatoknál!
2. Ha a dokumentumból nem tudod kiolvasni a pontos hektárszámot egy kultúrához, akkor NE HASZNÁLJ KITALÁLT ADATOT, hanem hagyj ki azt a kultúrát.
3. A termésátlag (yieldPerHectare) értékeknek reális magyar értékeknek kell lenniük (pl. búza: 5-6 t/ha, kukorica: 7-9 t/ha)
4. A piaci áraknak (pricePerTon) aktuális magyarországi áraknak kell lenniük (pl. búza: ~80-90ezer Ft/t, kukorica: ~70-75ezer Ft/t)
5. Az árbevétel számítása: hektár × termésátlag × ár képlettel történik minden kultúrára
6. A teljes árbevétel az összes kultúra árbevételének összege
7. TILTOTT A RANDOM ADATOK GENERÁLÁSA! Csak valós, a dokumentumból kiolvasott vagy ahhoz kapcsolódó reális adatokat használj!

Az adatokat a következő JSON formátumban add vissza:
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

FIGYELEM! Ne generálj véletlenszerű adatokat! Ha nem találod az információt a dokumentumban, akkor inkább használj üres listát vagy nullát, de ne találj ki adatokat!

HA NEM TUDSZ VALÓS ADATOKAT KINYERNI, AZT JELEZD EGYÉRTELMŰEN, de adj vissza egy üres adatstruktúrát a megadott formátumban.`
    });
    console.log(`✅ Üzenet létrehozva: ${message.id}`);
    
    // Futtatás indítása
    console.log(`🚀 Futtatás indítása a threaden (${threadId}) az asszisztenssel (${assistantId})...`);
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: `
NAGYON FONTOS! A FELDOLGOZÁST PONTOSAN ÉS PRECÍZEN VÉGEZD EL!

Elemezd a SAPS dokumentumot és olvasd ki belőle a gazdálkodási információkat.

A FELADAT: A dokumentumból ki kell nyerned a következő információkat:
1. A gazdálkodó neve
2. A dokumentum azonosítója
3. A régió (megye) neve
4. Az összes növénykultúra neve és területe hektárban
5. Minden kultúrához reális termésátlag (t/ha) értéket és piaci árat (Ft/t) kell rendelned

KÖVETELMÉNYEK:
1. MINDEN SZÁMSZERŰ ÉRTÉKNEK NAGYOBBNAK KELL LENNIE NULLÁNÁL - ez különösen fontos a hektár, termésátlag és ár adatoknál!
2. Ha a dokumentumból nem tudod kiolvasni a pontos hektárszámot egy kultúrához, akkor NE HASZNÁLJ KITALÁLT ADATOT, hanem hagyj ki azt a kultúrát.
3. A termésátlag (yieldPerHectare) értékeknek reális magyar értékeknek kell lenniük (pl. búza: 5-6 t/ha, kukorica: 7-9 t/ha)
4. A piaci áraknak (pricePerTon) aktuális magyarországi áraknak kell lenniük (pl. búza: ~80-90ezer Ft/t, kukorica: ~70-75ezer Ft/t)
5. Az árbevétel számítása: hektár × termésátlag × ár képlettel történik minden kultúrára
6. A teljes árbevétel az összes kultúra árbevételének összege
7. TILTOTT A RANDOM ADATOK GENERÁLÁSA! Csak valós, a dokumentumból kiolvasott vagy ahhoz kapcsolódó reális adatokat használj!

Ha nem sikerül érvényes adatokat kinyerned, vagy nem biztos, hogy helyesek az adatok, akkor azt egyértelműen jelezd, és adj vissza egy üres adatstruktúrát vagy nullákat a kötelező mezőkben.

LEGFONTOSABB SZEMPONT: INKÁBB SEMMILYEN ADAT, MINT HIBÁS VAGY KITALÁLT ADAT!
`
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
