
import { openai, getErrorDetails } from "./openaiClient.ts";

// Asszisztens létrehozása
export async function createAssistant() {
  console.log("🤖 Asszisztens létrehozása...");
  const assistantStart = Date.now();
  
  const assistant = await openai.beta.assistants.create({
    name: "SAPS Dokumentum Elemző",
    instructions: `Olvasd ki a dokumentumból a következő mezőket JSON formátumban:
      {
        "hectares": "Összes terület hektárban",
        "cultures": [
          {
            "name": "Kultúra neve",
            "hectares": "Kultúra területe",
            "estimatedRevenue": "Becsült árbevétel"
          }
        ],
        "totalRevenue": "Összes becsült árbevétel",
        "region": "Gazdaság régiója",
        "blockIds": ["Blokkazonosítók listája"]
      }`,
    tools: [{ type: "file_search" }],
    model: "gpt-4o-mini"
  }).catch(error => {
    console.error("❌ Hiba az asszisztens létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  });
  
  const assistantTime = Date.now() - assistantStart;
  console.log(`✅ Asszisztens létrehozva (${assistantTime}ms). ID: ${assistant.id}`);
  
  return assistant;
}

// Thread létrehozása
export async function createThread() {
  console.log("📝 Thread létrehozása...");
  const threadStart = Date.now();
  
  const thread = await openai.beta.threads.create().catch(error => {
    console.error("❌ Hiba a thread létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  });
  
  const threadTime = Date.now() - threadStart;
  console.log(`✅ Thread létrehozva (${threadTime}ms). ID: ${thread.id}`);
  
  return thread;
}

// Üzenet hozzáadása egy threadhez file_id-val
export async function addMessageToThread(threadId: string, fileId: string) {
  console.log(`📤 Üzenet létrehozása fileId-val: ${fileId}`);
  const messageStart = Date.now();
  
  try {
    const message = await openai.beta.threads.messages.create(threadId, {
      role: "user",
      content: "Olvasd ki a SAPS dokumentum részleteit JSON formátumban.",
      file_ids: [fileId]  // Helyesen formázott file_ids paraméter (array)
    });
    
    const messageTime = Date.now() - messageStart;
    console.log(`✅ Üzenet sikeresen létrehozva (${messageTime}ms). Message ID: ${message.id}`);
    return message;
  } catch (error) {
    console.error("❌ Hiba az üzenet létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  }
}

// Futtatás indítása
export async function startRun(threadId: string, assistantId: string) {
  console.log(`🏃 Feldolgozás indítása asszisztens ID-val: ${assistantId}`);
  const runStart = Date.now();
  
  const run = await openai.beta.threads.runs.create(threadId, {
    assistant_id: assistantId
  }).catch(error => {
    console.error("❌ Hiba a futtatás létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  });
  
  const runTime = Date.now() - runStart;
  console.log(`✅ Feldolgozás elindítva (${runTime}ms). Run ID: ${run.id}`);
  
  return run;
}
