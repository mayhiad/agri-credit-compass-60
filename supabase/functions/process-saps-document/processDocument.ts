
import { getErrorDetails } from "./openaiClient.ts";
import { API_TIMEOUT } from "./fetchUtils.ts";
import { 
  saveDocumentToStorage, 
  extractTextFromDocument, 
  logOcrResult,
  logExtractionResult,
  convertPdfFirstPageToImage
} from "./fileUtils.ts";
import { processDocumentWithClaude, processPdfPagesWithClaude } from "./claudeProcessor.ts";

// Dokumentum feldolgozása Claude AI segítségével
export async function processDocumentWithOpenAI(
  fileBuffer: ArrayBuffer, 
  fileName: string, 
  userId: string, 
  pdfImageBase64: string | null = null,
  pdfImagesBase64: string[] = []
) {
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
    
    // Ellenőrizzük, hogy PDF fájl-e, és ha igen, van-e már konvertált képünk
    // Ha nincs előre konvertált képünk, megpróbáljuk itt konvertálni
    if (fileName.toLowerCase().endsWith('.pdf') && !pdfImageBase64) {
      console.log(`🖼️ PDF első oldalának képpé konvertálása a szerveren...`);
      pdfImageBase64 = await convertPdfFirstPageToImage(fileBuffer);
      if (pdfImageBase64) {
        console.log(`✅ PDF első oldala sikeresen képpé konvertálva a szerveren.`);
      } else {
        console.warn(`⚠️ Nem sikerült a PDF-et képpé konvertálni a szerveren.`);
      }
    }
    
    // Dokumentum feldolgozása Claude-dal
    console.log(`🤖 Dokumentum feldolgozása Claude AI-val...`);
    
    // Többoldalas feldolgozás, ha van ilyen adat
    let batchProcessingResult: string | null = null;
    if (pdfImagesBase64 && pdfImagesBase64.length > 0) {
      console.log(`🔍 Többoldalas PDF feldolgozása: ${pdfImagesBase64.length} oldal`);
      batchProcessingResult = await processPdfPagesWithClaude(pdfImagesBase64);
      console.log(`✅ Többoldalas PDF feldolgozás eredménye: ${batchProcessingResult ? batchProcessingResult.substring(0, 100) + '...' : 'sikertelen'}`);
    }
    
    // Egyes oldalas feldolgozás (első vagy egyetlen oldal)
    const result = await processDocumentWithClaude(fileBuffer, fileName, pdfImageBase64);
    console.log(`✅ Claude feldolgozás eredménye:`, result);
    
    // Ha van többoldalas feldolgozás, hozzáadjuk az eredményhez
    if (batchProcessingResult) {
      result.rawText = `${result.rawText || ''}\n\nTöbboldals feldolgozás eredménye:\n${batchProcessingResult}`;
      
      // Ha az egyes oldalas feldolgozásból nem sikerült kinyerni adatokat, próbáljuk a többoldalasból
      if (!result.data.submitterId || result.data.submitterId === "1234567890") {
        try {
          console.log(`🧠 Próbálkozás adatok kinyerésével a többoldalas feldolgozásból...`);
          const jsonMatch = batchProcessingResult.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const extractedData = JSON.parse(jsonMatch[0]);
            console.log(`✅ Adatok kinyerve a többoldalas feldolgozásból: ${JSON.stringify(extractedData)}`);
            
            // Frissítjük az eredményeket a többoldalas feldolgozásból
            result.data.applicantName = extractedData.submitterName || result.data.applicantName;
            result.data.submitterId = extractedData.submitterId || result.data.submitterId;
            result.data.applicantId = extractedData.applicantId || result.data.applicantId;
          }
        } catch (error) {
          console.error(`❌ Hiba a többoldalas feldolgozás adatainak kinyerésekor: ${error}`);
        }
      }
    }
    
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

    return {
      ocrLogId: ocrLogId,
      data: result.data,
      status: 'completed'
    };

  } catch (error) {
    console.error("🚨 Teljes feldolgozási hiba:", getErrorDetails(error));
    console.error("🚨 Hiba részletei:", JSON.stringify(error, null, 2));
    throw error;
  }
}
