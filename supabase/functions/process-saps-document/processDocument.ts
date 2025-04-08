
import { getErrorDetails } from "./openaiClient.ts";
import { API_TIMEOUT } from "./fetchUtils.ts";
import { 
  saveDocumentToStorage, 
  extractTextFromDocument, 
  logOcrResult,
  logExtractionResult,
  saveRawClaudeResponse
} from "./fileUtils.ts";
import { processDocumentWithClaude } from "./claudeProcessor.ts";

// Dokumentum feldolgozása Claude AI segítségével
export async function processDocumentWithOpenAI(fileBuffer: ArrayBuffer, fileName: string, userId: string) {
  console.log(`🔍 Dokumentum feldolgozás megkezdése: ${fileName}`);
  console.log(`📦 Dokumentum mérete: ${fileBuffer.byteLength} bájt`);
  console.log(`⏱️ Beállított API időtúllépés: ${API_TIMEOUT} másodperc`);
  console.log(`👤 Feldolgozást kezdeményező felhasználó: ${userId}`);

  try {
    const processingStart = Date.now();
    
    // Dokumentum mentése a Supabase tárolóba
    console.log(`💾 Dokumentum mentése a Supabase tárolóba kezdése...`);
    const storagePath = await saveDocumentToStorage(fileBuffer, fileName, userId);
    console.log(`✅ Dokumentum mentése a tárolóba ${storagePath ? 'sikeres' : 'sikertelen'}`);
    
    // Dokumentum feldolgozása Claude-dal
    console.log(`🤖 Dokumentum feldolgozása Claude AI-val...`);
    const result = await processDocumentWithClaude(fileBuffer, fileName);
    console.log(`✅ Claude feldolgozás eredménye:`, result);
    
    // OCR eredmény mentése az adatbázisba
    const ocrLogId = await logOcrResult(
      userId, 
      fileName, 
      fileBuffer.byteLength, 
      fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
      storagePath,
      result.rawText || "No OCR text available"
    );
    
    if (!ocrLogId) {
      console.warn(`⚠️ Az OCR eredmények nem kerültek mentésre az adatbázisba, de folytatjuk a feldolgozást`);
    } else {
      console.log(`✅ OCR napló sikeresen létrehozva: ${ocrLogId}`);
      
      // Nyers Claude válasz mentése szöveges dokumentumként
      await saveRawClaudeResponse(result.rawText || "", fileName, userId, ocrLogId);
    }
    
    // AI feldolgozás indításának naplózása az adatbázisba
    const processingTime = Date.now() - processingStart;
    if (ocrLogId) {
      await logExtractionResult(
        ocrLogId,
        userId,
        result.data || { status: 'processing' },
        result.data ? 'completed' : 'in_progress',
        processingTime,
        undefined, // nincs thread_id a Claude esetén
        undefined  // nincs run_id a Claude esetén
      );
    }

    // Add the ocrLogId to the result data so it can be displayed in the UI
    if (result.data && ocrLogId) {
      result.data.ocrLogId = ocrLogId;
    }

    return {
      ocrLogId: ocrLogId,
      data: result.data,
      status: 'completed',
      batchInfo: result.batchInfo
    };

  } catch (error) {
    console.error("🚨 Teljes feldolgozási hiba:", getErrorDetails(error));
    console.error("🚨 Hiba részletei:", JSON.stringify(error, null, 2));
    throw error;
  }
}
