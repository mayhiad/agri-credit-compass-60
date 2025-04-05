
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

  try {
    // Dokumentum mentése a Supabase tárolóba
    await saveDocumentToStorage(fileBuffer, fileName, userId);
    
    // Fájl feltöltése OpenAI-ba
    const file = await uploadFileToOpenAI(fileBuffer, fileName);
    console.log(`✅ Fájl sikeresen feltöltve OpenAI-ba. File ID: ${file.id}`);
    
    // Asszisztens létrehozása
    const assistant = await createAssistant();
    console.log(`✅ Asszisztens sikeresen létrehozva. Assistant ID: ${assistant.id}`);
    
    // Thread létrehozása
    const thread = await createThread();
    console.log(`✅ Thread sikeresen létrehozva. Thread ID: ${thread.id}`);
    
    // Üzenet hozzáadása a threadhez (csak szöveges utasítással, fájl nélkül)
    await addMessageToThread(thread.id);
    console.log(`✅ Üzenet sikeresen hozzáadva a threadhez`);
    
    // Futtatás indítása a fájl hozzáadásával
    const run = await startRun(thread.id, assistant.id, file.id);
    console.log(`✅ Futtatás sikeresen elindítva. Run ID: ${run.id}`);

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
