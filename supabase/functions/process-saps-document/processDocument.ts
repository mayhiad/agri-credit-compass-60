
import { getErrorDetails } from "./openaiClient.ts";
import { API_TIMEOUT } from "./fetchUtils.ts";
import { saveDocumentToStorage, extractTextFromDocument } from "./fileUtils.ts";
import { 
  createAssistant, 
  createThread, 
  processDocumentText 
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
    
    // Szöveg kinyerése a dokumentumból
    console.log(`📄 Szöveg kinyerése a dokumentumból...`);
    const documentText = await extractTextFromDocument(fileBuffer, fileName);
    console.log(`✅ Szöveg kinyerése sikeres. Szöveg hossza: ${documentText.length} karakter`);
    
    // Ha túl rövid a szöveg, jelezzük, hogy lehet, hogy nem sikerült megfelelően kinyerni
    if (documentText.length < 100) {
      console.warn(`⚠️ A dokumentumból kinyert szöveg nagyon rövid (${documentText.length} karakter), lehet, hogy nem sikerült megfelelően feldolgozni.`);
    }
    
    // Szöveg első 500 karakterének naplózása (csak a fejlesztés során)
    const firstChars = documentText.substring(0, 500);
    console.log(`📝 Szöveg kezdete (első 500 karakter): ${firstChars}...`);
    
    // Asszisztens létrehozása
    console.log(`🤖 Asszisztens létrehozásának kezdése...`);
    const assistant = await createAssistant();
    console.log(`✅ Asszisztens sikeresen létrehozva. Assistant ID: ${assistant.id}, Modell: ${assistant.model}`);
    
    // Thread létrehozása
    console.log(`📝 Thread létrehozásának kezdése...`);
    const thread = await createThread();
    console.log(`✅ Thread sikeresen létrehozva. Thread ID: ${thread.id}`);
    
    // Szöveg feldolgozása az OpenAI-val
    console.log(`🚀 Dokumentum szöveg feldolgozásának előkészítése a következő adatokkal:`);
    console.log(`    - Thread ID: ${thread.id}`);
    console.log(`    - Assistant ID: ${assistant.id}`);
    console.log(`    - Dokumentum szöveg hossza: ${documentText.length} karakter`);
    
    const run = await processDocumentText(thread.id, assistant.id, documentText);
    console.log(`✅ Feldolgozás sikeresen elindítva. Run ID: ${run.id}, Státusz: ${run.status}`);

    return {
      threadId: thread.id,
      runId: run.id,
      assistantId: assistant.id
    };

  } catch (error) {
    console.error("🚨 Teljes feldolgozási hiba:", getErrorDetails(error));
    console.error("🚨 Hiba részletei:", JSON.stringify(error, null, 2));
    throw error;
  }
}
