
import { FarmData } from "@/types/farm";
import { ProcessingStatus } from "@/types/processing";
import { supabase } from "@/integrations/supabase/client";
import { processDocumentWithOpenAI } from "@/services/documentProcessingService";
import { generateFallbackFarmData, validateAndFixFarmData } from "@/services/fallbackDataService";

// Maximum number of images that Claude can process at once
const MAX_IMAGES_PER_BATCH = 20;

/**
 * Process a document using Claude AI with batch processing support
 */
export const processWithClaude = async (
  file: File,
  user: any,
  updateStatus: (status: ProcessingStatus) => void
): Promise<FarmData> => {
  // Document processing with Claude
  let processResult;
  
  try {
    updateStatus({
      step: "Claude AI feldolgozás előkészítése",
      progress: 40,
      details: "A dokumentum Claude AI-val történő feldolgozása folyamatban..."
    });
    
    // Estimate page count based on file size
    const isPdf = file.name.toLowerCase().endsWith('.pdf');
    const estimatedPages = isPdf ? Math.ceil(file.size / 100000) : 1; // Rough estimate: 100KB per page
    const totalBatches = Math.ceil(estimatedPages / MAX_IMAGES_PER_BATCH);
    
    updateStatus({
      step: "PDF dokumentum feldolgozása",
      progress: 45,
      details: `A dokumentum feldolgozása ${totalBatches} kötegben történik (${estimatedPages} becsült oldal)`,
      batchProgress: {
        currentBatch: 1,
        totalBatches: totalBatches,
        pagesProcessed: 0,
        totalPages: estimatedPages
      }
    });
    
    processResult = await processDocumentWithOpenAI(file, user);
    
    if (!processResult) {
      throw new Error("Hiba történt a dokumentum feldolgozása során");
    }
    
    // Update batch progress information
    if (processResult.batchInfo) {
      updateStatus({
        step: "Claude AI feldolgozás folyamatban",
        progress: 60,
        details: `Dokumentum feldolgozás: ${processResult.batchInfo.processedBatches}/${processResult.batchInfo.totalBatches} köteg`,
        batchProgress: {
          currentBatch: processResult.batchInfo.processedBatches,
          totalBatches: processResult.batchInfo.totalBatches,
          pagesProcessed: processResult.batchInfo.processedPages,
          totalPages: processResult.batchInfo.totalPages || estimatedPages
        }
      });
    }
  } catch (error) {
    console.error("Claude feldolgozási hiba:", error);
    throw new Error(`Az AI feldolgozás sikertelen volt: ${error.message || "Ismeretlen hiba"}`);
  }
  
  updateStatus({
    step: "Claude AI feldolgozás folyamatban",
    progress: 60,
    details: "A Claude feldolgozza a dokumentumot, ez néhány másodpercet igénybe vehet..."
  });
  
  // Ha közvetlen választ kaptunk Claude-tól:
  if (processResult.data) {
    updateStatus({
      step: "Dokumentum elemzése befejezve",
      progress: 80,
      details: "A Claude AI feldolgozta a dokumentumot"
    });
    
    let farmData: FarmData = processResult.data;
    
    // Ellenőrizzük, hogy a farm adatok hiányosak-e
    if (!farmData.applicantName || !farmData.submitterId || !farmData.applicantId) {
      console.warn("A Claude által feldolgozott adatok hiányosak:", farmData);
      
      updateStatus({
        step: "Alapértelmezett adatok generálása",
        progress: 85,
        details: "Az AI nem tudott elegendő adatot kinyerni, példa adatok generálása..."
      });
      
      // Fallback adatok generálása, de megtartjuk amit tudunk
      const fallbackData = generateFallbackFarmData(user.id, file.name, file.size);
      
      // Megtartjuk a Claude által kinyert adatokat, ha vannak
      farmData = {
        ...fallbackData,
        applicantName: farmData.applicantName || fallbackData.applicantName,
        documentId: farmData.documentId || fallbackData.documentId,
        submitterId: farmData.submitterId || fallbackData.submitterId,
        applicantId: farmData.applicantId || fallbackData.applicantId,
        errorMessage: "Nem sikerült az összes adatot kinyerni a dokumentumból. Demonstrációs adatok kerültek megjelenítésre.",
        rawText: farmData.rawText || ""
      };
    }
    
    // Add file metadata
    farmData.fileName = file.name;
    farmData.fileSize = file.size;
    
    // További validáció és hiányzó mezők pótlása
    farmData = validateAndFixFarmData(farmData);
    
    updateStatus({
      step: "Adatok feldolgozása",
      progress: 90,
      details: `${farmData.submitterId || "Ismeretlen"} ügyfél-azonosító feldolgozva`
    });
    
    return farmData;
  }
  
  // Ha nincs közvetlen válasz, fallback adatok
  console.warn("AI feldolgozás sikertelen, fallback adatok generálása...");
  let farmData = generateFallbackFarmData(user.id, file.name, file.size);
  
  // Add file metadata
  farmData.fileName = file.name;
  farmData.fileSize = file.size;
  
  updateStatus({
    step: "Feldolgozás sikertelen",
    progress: 90,
    details: "Nem sikerült az adatokat kinyerni. Alapértelmezett adatok előállítása..."
  });
  
  // További validáció és hiányzó mezők pótlása
  farmData = validateAndFixFarmData(farmData);
  
  return farmData;
};
