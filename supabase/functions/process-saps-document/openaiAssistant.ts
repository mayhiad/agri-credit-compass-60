
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
      tools: [
        { type: "file_search" },
        { type: "code_interpreter" }
      ],
      instructions: `
Kérlek olvasd ki a dokumentumból a gazdálkodó nevét. Ez általában a dokumentum elején, a fejlécben vagy az űrlap első oldalán található.

Csak a gazdálkodó nevét add vissza JSON formátumban:
{
  "applicantName": "GAZDÁLKODÓ NEVE"
}
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

// Üzenet hozzáadása egy threadhez
export async function addMessageToThread(threadId, content = "Kérlek, olvasd ki a gazdálkodó nevét a dokumentumból!") {
  console.log(`📩 Üzenet hozzáadása a threadhez: ${threadId}, tartalom: "${content}"`);
  try {
    // Rendszerüzenet hozzáadása a threadhez (ugyanaz, mint a createAssistant instructions)
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `
Kérlek olvasd ki a dokumentumból a gazdálkodó nevét. Ez általában a dokumentum elején, a fejlécben vagy az űrlap első oldalán található.

Csak a gazdálkodó nevét add vissza JSON formátumban:
{
  "applicantName": "GAZDÁLKODÓ NEVE"
}
`
    });
    console.log(`✅ Üzenet létrehozva: ${message.id}`);
    return message;
  } catch (error) {
    console.error("❌ Hiba az üzenet hozzáadásakor:", getErrorDetails(error));
    throw error;
  }
}

// Fájl hozzáadása a thread-hez és futtatás indítása
export async function startRun(threadId, assistantId, fileId) {
  console.log(`🏃 Feldolgozás indítása - Thread ID: ${threadId}, Asszisztens ID: ${assistantId}, Fájl ID: ${fileId}`);
  
  // Ellenőrizzük a file ID formátumát
  if (!fileId.startsWith('file-')) {
    console.warn(`⚠️ FIGYELEM: A fileId (${fileId}) nem a várt "file-" formátumban van. Ez problémát okozhat a feldolgozás során.`);
  } else {
    console.log(`✓ File ID formátum megfelelő: ${fileId}`);
  }
  
  const runStart = Date.now();
  
  try {
    // A legfrissebb OpenAI API-ban a file_ids paramétert nem a messages.create-nél, 
    // hanem a thread.runs.create-nél kell használni a tool_resources objektumban
    console.log(`🚀 Futtatás indítása módosított struktúrával...`);
    
    // Ellenőrizzük, hogy a fileId formátuma megfelelő-e
    if (!fileId.startsWith('file-')) {
      console.warn(`⚠️ FIGYELEM: Nem szabványos fájl ID formátum: ${fileId}`);
    }
    
    // Először hozzáadunk egy egyszerű üzenetet a threadhez (fájl nélkül)
    console.log(`📩 Üzenet hozzáadása a threadhez fájl nélkül...`);
    const messageWithoutFile = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: "Kérlek, olvasd ki a gazdálkodó nevét a dokumentumból!"
    });
    console.log(`✅ Üzenet létrehozva fájl nélkül: ${messageWithoutFile.id}`);
    
    // Majd elindítjuk a futtatást az assistantId-val és a fileId-val a tool_resources-ban
    console.log(`🚀 Futtatás indítása a threaden (${threadId}) az asszisztenssel (${assistantId}) és a file_search eszközzel...`);
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      instructions: "Olvasd ki a gazdálkodó nevét a dokumentumból JSON formátumban.",
      tool_resources: {
        file_search: {
          file_ids: [fileId]
        }
      }
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
