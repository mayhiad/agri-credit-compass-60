
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

A FELADAT: A feltöltött SAPS dokumentumból CSAK a következő információkat kell kinyerned:
1. A gazdálkodó (kérelmező) neve
2. A gazdálkodó (kérelmező) azonosítószáma (10 jegyű szám)
3. A beadó/benyújtó azonosítószáma (ha különbözik a kérelmezőétől)

KÖVETELMÉNYEK:
1. CSAK a fenti adatokat keresd, semmi mást!
2. Ha nem találod a pontos adatokat, akkor írd, hogy "ismeretlen" vagy "nem található"
3. NE TALÁLJ KI ADATOKAT! Csak a dokumentumban ténylegesen szereplő információkat használd!

Az adatokat a következő JSON formátumban add vissza:
{
  "applicantName": "A gazdálkodó neve vagy 'ismeretlen'",
  "documentId": "10 jegyű azonosító vagy 'ismeretlen'",
  "submitterId": "10 jegyű beadói azonosító vagy 'ismeretlen' (ha ugyanaz, mint a kérelmezőé, akkor is add meg)",
  "hectares": 0,
  "cultures": [],
  "blockIds": [],
  "totalRevenue": 0,
  "region": ""
}

FIGYELEM! Ne generálj véletlenszerű adatokat! Ha nem találod az információt a dokumentumban, akkor használj "ismeretlen" értéket vagy üres mezőt.

A SAPS dokumentumokban általában az első oldalakon szerepel a gazdálkodó neve a "Kérelmező" vagy "Ügyfél" vagy hasonló fejléc alatt, valamint a 10 jegyű azonosítószám, amit "Ügyfél-azonosító" vagy "Azonosító" néven jelölnek.`
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

Elemezd a következő SAPS dokumentumot és nyerd ki belőle a gazdálkodó adatait:

${documentText.substring(0, 25000)}

A FELADAT: A dokumentumból CSAK a következő információkat kell kinyerned:
1. A gazdálkodó (kérelmező) neve
2. A gazdálkodó (kérelmező) azonosítószáma (10 jegyű szám)
3. A beadó/benyújtó azonosítószáma (ha különbözik a kérelmezőétől)

KÖVETELMÉNYEK:
1. CSAK a fenti adatokat keresd, semmi mást!
2. Ha nem találod a pontos adatokat, akkor írd, hogy "ismeretlen" vagy "nem található"
3. NE TALÁLJ KI ADATOKAT! Csak a dokumentumban ténylegesen szereplő információkat használd!

Az adatokat a következő JSON formátumban add vissza:
{
  "applicantName": "A gazdálkodó neve vagy 'ismeretlen'",
  "documentId": "10 jegyű azonosító vagy 'ismeretlen'",
  "submitterId": "10 jegyű beadói azonosító vagy 'ismeretlen' (ha ugyanaz, mint a kérelmezőé, akkor is add meg)",
  "hectares": 0,
  "cultures": [],
  "blockIds": [],
  "totalRevenue": 0,
  "region": ""
}

FIGYELEM! Ne generálj véletlenszerű adatokat! Ha nem találod az információt a dokumentumban, akkor használj "ismeretlen" értéket vagy üres mezőt.`
    });
    console.log(`✅ Üzenet létrehozva: ${message.id}`);
    
    // Futtatás indítása
    console.log(`🚀 Futtatás indítása a threaden (${threadId}) az asszisztenssel (${assistantId})...`);
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: `
NAGYON FONTOS! A FELDOLGOZÁST PONTOSAN ÉS PRECÍZEN VÉGEZD EL!

Elemezd a SAPS dokumentumot és olvasd ki belőle CSAK a kért adatokat:
1. A gazdálkodó (kérelmező) neve
2. A gazdálkodó (kérelmező) azonosítószáma (10 jegyű szám)
3. A beadó/benyújtó azonosítószáma (ha különbözik a kérelmezőétől)

CSAK ezeket az adatokat keresd, semmi mást! Válaszolj a megadott JSON formátumban.
Ha nem találsz valamit, használj "ismeretlen" értéket.

Kerüld az adatok kitalálását, csak azt add vissza, amit tisztán látsz a dokumentumban!
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
