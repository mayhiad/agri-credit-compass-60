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
      tools: [{ type: "file_search" }],
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
  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content
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
  console.log(`🏃 Feldolgozás indítása asszisztens ID-val: ${assistantId} és fájl ID-val: ${fileId}`);
  const runStart = Date.now();
  try {
    // Rendszerüzenet hozzáadása a threadhez
    await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: `Rendszerüzenet: Azt szeretném, ha kiolvasnád a gazdálkodó nevét a dokumentumból és visszaadnád JSON formátumban: { "applicantName": "GAZDÁLKODÓ NEVE" }`
    });

    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: assistantId,
      tool_resources: {
        file_search: {
          file_ids: [fileId]
        }
      }
    });

    const runTime = Date.now() - runStart;
    console.log(`✅ Feldolgozás elindítva (${runTime}ms). Run ID: ${run.id}`);
    return run;
  } catch (error) {
    console.error("❌ Hiba a futtatás létrehozása során:", getErrorDetails(error));
    throw error;
  }
}
