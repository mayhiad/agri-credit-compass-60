
import { getErrorDetails } from "./openaiClient.ts";
import { API_TIMEOUT } from "./fetchUtils.ts";
import { uploadFileToOpenAI, saveDocumentToStorage } from "./fileUtils.ts";
import { 
  createAssistant, 
  createThread, 
  addMessageToThread, 
  startRun 
} from "./openaiAssistant.ts";

// Dokumentum feldolgozása OpenAI segítségével
export async function processDocumentWithOpenAI(fileBuffer: ArrayBuffer, fileName: string, userId: string) {
  console.log(`🔍 Dokumentum feldolgozás megkezdése: ${fileName}`);
  console.log(`📦 Dokumentum mérete: ${fileBuffer.byteLength} bájt`);
  console.log(`⏱️ Beállított API időtúllépés: ${API_TIMEOUT} másodperc`);
  console.log(`👤 Feldolgozást kezdeményező felhasználó: ${userId}`);

  try {
    // Dokumentum mentése a Supabase tárolóba
    console.log(`💾 Dokumentum mentése a Supabase tárolóba kezdése...`);
    const storagePath = await saveDocumentToStorage(fileBuffer, fileName, userId);
    console.log(`✅ Dokumentum mentése a tárolóba ${storagePath ? 'sikeres' : 'sikertelen'}`);
    
    // Fájl feltöltése OpenAI-ba
    console.log(`☁️ Fájl feltöltése OpenAI-ba kezdése...`);
    const file = await uploadFileToOpenAI(fileBuffer, fileName);
    console.log(`✅ Fájl sikeresen feltöltve OpenAI-ba. File ID: ${file.id}, Név: ${file.filename}, Méret: ${file.bytes} bájt`);
    
    // Asszisztens létrehozása
    console.log(`🤖 Asszisztens létrehozásának kezdése...`);
    const assistant = await createAssistant();
    console.log(`✅ Asszisztens sikeresen létrehozva. Assistant ID: ${assistant.id}, Modell: ${assistant.model}`);
    
    // Thread létrehozása
    console.log(`📝 Thread létrehozásának kezdése...`);
    const thread = await createThread();
    console.log(`✅ Thread sikeresen létrehozva. Thread ID: ${thread.id}`);
    
    // Üzenet hozzáadása a threadhez (csak szöveges utasítással, fájl nélkül)
    console.log(`📩 Alap üzenet hozzáadása a thread-hez...`);
    await addMessageToThread(thread.id);
    console.log(`✅ Üzenet sikeresen hozzáadva a threadhez`);
    
    // Futtatás indítása a fájl hozzáadásával
    console.log(`🚀 Futtatás előkészítése a következő adatokkal: Thread ID: ${thread.id}, Assistant ID: ${assistant.id}, File ID: ${file.id}`);
    const run = await startRun(thread.id, assistant.id, file.id);
    console.log(`✅ Futtatás sikeresen elindítva. Run ID: ${run.id}, Státusz: ${run.status}`);

    return {
      threadId: thread.id,
      runId: run.id,
      fileId: file.id,
      assistantId: assistant.id
    };

  } catch (error) {
    console.error("🚨 Teljes feldolgozási hiba:", getErrorDetails(error));
    console.error("🚨 Hiba részletei:", JSON.stringify(error, null, 2));
    throw error;
  }
}
