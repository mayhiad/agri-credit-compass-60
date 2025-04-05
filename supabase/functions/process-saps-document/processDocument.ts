
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
    // Asszisztens létrehozása
    const assistant = await createAssistant();
    // Thread létrehozása
    const thread = await createThread();
    // Üzenet hozzáadása a threadhez (csak szöveges utasítással)
    await addMessageToThread(thread.id);
    // Futtatás indítása a fájl hozzáadásával
    const run = await startRun(thread.id, assistant.id, file.id);

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
