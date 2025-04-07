
import { FarmData } from "@/types/farm";
import { ProcessingStatus } from "@/types/processing";
import { uploadFileToStorage } from "@/utils/storageUtils";
import { processWithClaude } from "@/services/documentProcessor";
import { validateDocumentFile } from "@/services/documentValidation";
import { saveFarmDataToDatabase } from "@/services/farmDataService";

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
  
  // Először feltöltjük a dokumentumot a Storage-ba
  const storagePath = await uploadFileToStorage(file, user.id);
  
  if (storagePath) {
    updateStatus({
      step: "Dokumentum mentve a tárhelyre",
      progress: 20,
      details: `Fájl sikeresen mentve: ${storagePath}`
    });
  } else {
    console.warn("A fájl mentése a tárhelyre sikertelen volt, de a feldolgozás folytatódik");
  }
  
  updateStatus({
    step: "Dokumentum feltöltése",
    progress: 30,
  });
  
  // Claude feldolgozás
  const farmData = await processWithClaude(file, user, updateStatus);
  
  // Mentsük el az adatbázisba a feldolgozott adatokat
  updateStatus({
    step: "Adatok mentése az adatbázisba",
    progress: 95,
    details: "Ügyfél adatok rögzítése...",
    wordDocumentUrl: farmData.wordDocumentUrl
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
      wordDocumentUrl: farmData.wordDocumentUrl
    });
    
    return farmData;
  } catch (error) {
    console.error("Hiba az adatok mentése során:", error);
    
    // Még mindig visszaadjuk a farm adatokat, de figyelmeztetünk a mentési hibára
    updateStatus({
      step: "Feldolgozás befejezve figyelmeztetéssel",
      progress: 100,
      details: "Adatok feldolgozva, de nem sikerült menteni az adatbázisba.",
      wordDocumentUrl: farmData.wordDocumentUrl
    });
    
    return farmData;
  }
};

// Re-export the ProcessingStatus type for backward compatibility
export type { ProcessingStatus } from "@/types/processing";
