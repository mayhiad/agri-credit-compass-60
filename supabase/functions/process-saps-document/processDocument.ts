
import { openai, supabase, getErrorDetails } from "./openaiClient.ts";
import { API_TIMEOUT } from "./fetchUtils.ts";

// Dokumentum feldolgozása OpenAI segítségével
export async function processDocumentWithOpenAI(fileBuffer: ArrayBuffer, fileName: string, userId: string) {
  console.log(`🔍 Dokumentum feldolgozás megkezdése: ${fileName}`);
  console.log(`📦 Dokumentum mérete: ${fileBuffer.byteLength} bájt`);

  try {
    // Dokumentum mentése a Supabase tárolóba
    await saveDocumentToStorage(fileBuffer, fileName, userId);
    
    // Fájl feltöltése OpenAI-ba
    const file = await uploadFileToOpenAI(fileBuffer, fileName);
    // Asszisztens létrehozása
    const assistant = await createAssistant();
    // Thread létrehozása
    const thread = await createThread();
    // Üzenet hozzáadása a threadhez file_id-val
    await addMessageToThread(thread.id, file.id);
    // Futtatás
    const run = await startRun(thread.id, assistant.id);

    return {
      threadId: thread.id,
      runId: run.id,
      fileId: file.id
    };

  } catch (error) {
    console.error("🚨 Teljes feldolgozási hiba:", getErrorDetails(error));
    throw error;
  }
}

// Dokumentum mentése a Supabase tárolóba
async function saveDocumentToStorage(fileBuffer: ArrayBuffer, fileName: string, userId: string) {
  try {
    console.log("💾 Dokumentum mentése a Supabase tárolóba...");
    const saveStart = Date.now();
    
    // Validáljuk a Supabase kliens állapotát
    if (!supabase || !supabase.storage) {
      console.error("❌ Supabase kliens nem elérhető vagy nincs inicializálva");
      return; // Folytatjuk a feldolgozást annak ellenére, hogy nem sikerült tárolni
    }
    
    // Generálunk egy egyedi fájl nevet
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = fileName.split('.').pop();
    
    // Tisztítjuk a fájlnevet a speciális karakterektől
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `saps/${userId}/${timestamp}-${cleanFileName}`;
    
    const { data, error } = await supabase.storage
      .from('dokumentumok')
      .upload(storagePath, fileBuffer, {
        contentType: fileExtension === 'pdf' ? 'application/pdf' : 
                    (fileExtension === 'xlsx' || fileExtension === 'xls') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                    'application/octet-stream',
        upsert: false
      });
    
    if (error) {
      console.error("❌ Hiba a dokumentum tárolása során:", error.message, error.details);
      // Folytatjuk a feldolgozást annak ellenére, hogy nem sikerült tárolni
    } else {
      const saveTime = Date.now() - saveStart;
      console.log(`✅ Dokumentum sikeresen tárolva (${saveTime}ms). Path: ${storagePath}`);
    }
  } catch (storageError) {
    console.error("❌ Váratlan hiba a dokumentum tárolása során:", getErrorDetails(storageError));
    // Folytatjuk a feldolgozást annak ellenére, hogy nem sikerült tárolni
  }
}

// Fájl feltöltése OpenAI-ba
async function uploadFileToOpenAI(fileBuffer: ArrayBuffer, fileName: string) {
  console.log("📤 Kísérlet fájl feltöltésére az OpenAI-ba...");
  const fileUploadStart = Date.now();
  
  const file = await openai.files.create({
    file: new File([fileBuffer], fileName, { type: 'application/pdf' }),
    purpose: "assistants"
  }).catch(error => {
    console.error("❌ Hiba a fájl feltöltése során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  });
  
  const fileUploadTime = Date.now() - fileUploadStart;
  console.log(`✅ Fájl sikeresen feltöltve (${fileUploadTime}ms). File ID: ${file.id}`);
  
  return file;
}

// Asszisztens létrehozása
async function createAssistant() {
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
async function createThread() {
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
async function addMessageToThread(threadId: string, fileId: string) {
  console.log(`📤 Üzenet létrehozása`);
  const messageStart = Date.now();
  
  await openai.beta.threads.messages.create(threadId, {
    role: "user",
    content: "Olvasd ki a SAPS dokumentum részleteit JSON formátumban.",
    attachments: [{ 
      file_id: fileId,
      type: "file_attachment",
      tools: [{ type: "file_search" }]  // Itt adjuk hozzá a hiányzó tools paramétert
    }]
  }).catch(error => {
    console.error("❌ Hiba az üzenet létrehozása során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }));
    throw error;
  });
  
  const messageTime = Date.now() - messageStart;
  console.log(`✅ Üzenet létrehozva (${messageTime}ms).`);
}

// Futtatás indítása
async function startRun(threadId: string, assistantId: string) {
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
