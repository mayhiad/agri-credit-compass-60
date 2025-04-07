
import { FarmData } from "@/types/farm";
import { ProcessingStatus } from "@/types/processing";
import { uploadFileToStorage } from "@/utils/storageUtils";
import { processWithClaude } from "@/services/documentProcessor";
import { validateDocumentFile } from "@/services/documentValidation";
import { saveFarmDataToDatabase } from "@/services/farmDataService";

// Estimate page count for a PDF based on file size
const estimatePageCount = (fileSize: number): number => {
  // Rough estimate: average PDF page is around 100KB
  const estimatedPages = Math.ceil(fileSize / 100000);
  // Minimum 1 page, maximum reasonable limit 
  return Math.max(1, Math.min(estimatedPages, 500));
};

// Calculate number of batches needed for processing
const calculateBatchCount = (pageCount: number, batchSize: number = 20): number => {
  return Math.ceil(pageCount / batchSize);
};

/**
 * Process a SAPS document file
 */
export const processSapsDocument = async (
  file: File, 
  user: any, 
  updateStatus: (status: ProcessingStatus) => void
): Promise<FarmData> => {
  if (!file) {
    throw new Error("Nincs kiválasztva fájl");
  }
  
  if (!user) {
    throw new Error("A dokumentum feldolgozásához be kell jelentkeznie");
  }
  
  updateStatus({
    step: "Dokumentum ellenőrzése",
    progress: 10,
  });
  
  // Estimate total pages and batches needed
  const estimatedPages = estimatePageCount(file.size);
  const totalBatches = calculateBatchCount(estimatedPages);
  
  console.log(`Becsült oldalszám: ${estimatedPages}, Becsült kötegek száma: ${totalBatches}`);
  
  updateStatus({
    step: "Dokumentum feldolgozás előkészítése",
    progress: 15,
    details: `A dokumentum előkészítése feldolgozásra (${estimatedPages} becsült oldal)`,
    batchProgress: {
      currentBatch: 0,
      totalBatches: totalBatches,
      pagesProcessed: 0,
      totalPages: estimatedPages
    }
  });
  
  // Először feltöltjük a dokumentumot a Storage-ba
  const storagePath = await uploadFileToStorage(file, user.id);
  
  if (storagePath) {
    updateStatus({
      step: "Dokumentum mentve a tárhelyre",
      progress: 20,
      details: `Fájl sikeresen mentve: ${storagePath}`,
      batchProgress: {
        currentBatch: 0,
        totalBatches: totalBatches,
        pagesProcessed: 0,
        totalPages: estimatedPages
      }
    });
  } else {
    console.warn("A fájl mentése a tárhelyre sikertelen volt, de a feldolgozás folytatódik");
  }
  
  updateStatus({
    step: "Dokumentum feltöltése",
    progress: 30,
    batchProgress: {
      currentBatch: 0,
      totalBatches: totalBatches,
      pagesProcessed: 0,
      totalPages: estimatedPages
    }
  });
  
  // Claude feldolgozás
  const farmData = await processWithClaude(file, user, (status) => {
    // Update batch progress
    updateStatus({
      ...status,
      batchProgress: status.batchProgress || {
        currentBatch: 1,
        totalBatches: totalBatches,
        pagesProcessed: Math.min(20, estimatedPages),
        totalPages: estimatedPages
      }
    });
  });
  
  // Mentsük el az adatbázisba a feldolgozott adatokat
  updateStatus({
    step: "Adatok mentése az adatbázisba",
    progress: 95,
    details: "Ügyfél adatok rögzítése...",
    wordDocumentUrl: farmData.wordDocumentUrl,
    batchProgress: {
      currentBatch: totalBatches,
      totalBatches: totalBatches,
      pagesProcessed: estimatedPages,
      totalPages: estimatedPages
    }
  });
  
  try {
    const farmId = await saveFarmDataToDatabase(farmData, user.id);
    
    if (farmId) {
      // Frissítsük a farm adatait a farmId-vel
      farmData.farmId = farmId;
    }
    
    localStorage.setItem("farmData", JSON.stringify(farmData));
    
    updateStatus({
      step: "Feldolgozás befejezve",
      progress: 100,
      details: `Ügyfél-azonosító: ${farmData.submitterId || "Ismeretlen"}, Név: ${farmData.applicantName || "Ismeretlen"} sikeresen feldolgozva és mentve.`,
      wordDocumentUrl: farmData.wordDocumentUrl,
      batchProgress: {
        currentBatch: totalBatches,
        totalBatches: totalBatches,
        pagesProcessed: estimatedPages,
        totalPages: estimatedPages
      }
    });
    
    return farmData;
  } catch (error) {
    console.error("Hiba az adatok mentése során:", error);
    
    // Még mindig visszaadjuk a farm adatokat, de figyelmeztetünk a mentési hibára
    updateStatus({
      step: "Feldolgozás befejezve figyelmeztetéssel",
      progress: 100,
      details: "Adatok feldolgozva, de nem sikerült menteni az adatbázisba.",
      wordDocumentUrl: farmData.wordDocumentUrl,
      batchProgress: {
        currentBatch: totalBatches,
        totalBatches: totalBatches,
        pagesProcessed: estimatedPages,
        totalPages: estimatedPages
      }
    });
    
    return farmData;
  }
};

// Re-export the ProcessingStatus type for backward compatibility
export type { ProcessingStatus } from "@/types/processing";
