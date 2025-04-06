
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

Feladatod:
1. Olvasd ki a gazdálkodó nevét, régióját és a kérelem/dokumentum azonosítóját
2. Azonosítsd az összes növénykultúrát (pl. búza, kukorica, napraforgó, stb.)
3. Minden kultúrához határozd meg a hektárszámot
4. Gyűjtsd ki az összes blokkazonosítót (MePAR azonosítók)
5. Határozd meg a teljes művelt területet hektárban

Az adatokat a következő JSON formátumban add vissza:
{
  "applicantName": "A gazdálkodó neve",
  "documentId": "Dokumentum/kérelem azonosító",
  "region": "Régió neve",
  "hectares": 123.45,
  "cultures": [
    {
      "name": "Kukorica",
      "hectares": 45.6
    },
    {
      "name": "Búza",
      "hectares": 77.85
    }
  ],
  "blockIds": ["L12AB-1-23", "K45CD-6-78"]
}

Ha valamelyik információt nem találod meg, használj üres értéket vagy becsült értéket. A legfontosabbak a növénykultúrák és a hozzájuk tartozó területméretek.
`
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
      content: `Elemezd a következő SAPS dokumentumot és olvasd ki belőle a gazdálkodási információkat:

${documentText.substring(0, 25000)}` // Az első 25000 karaktert küldjük csak (limitáljuk a méretét)
    });
    console.log(`✅ Üzenet létrehozva: ${message.id}`);
    
    // Futtatás indítása
    console.log(`🚀 Futtatás indítása a threaden (${threadId}) az asszisztenssel (${assistantId})...`);
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: "Elemezd a SAPS dokumentumot és olvasd ki belőle a gazdálkodási információkat a kért JSON formátumban."
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
