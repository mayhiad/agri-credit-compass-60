
import { FarmData } from "@/types/farm";
import { supabase } from "@/integrations/supabase/client";
import { processDocumentWithOpenAI, checkProcessingResults } from "@/services/documentProcessingService";
import { uploadFileToStorage } from "@/utils/storageUtils";
import { generateFallbackFarmData, validateAndFixFarmData } from "@/services/fallbackDataService";
import { extractFarmDataFromOcrText } from "@/services/sapsProcessor";

export type ProcessingStatus = {
  step: string;
  progress: number;
  details?: string;
  wordDocumentUrl?: string;
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
  return await processWithClaude(file, user, updateStatus);
};

/**
 * Claude asszisztens használata a dokumentum feldolgozásához
 */
const processWithClaude = async (
  file: File,
  user: any,
  updateStatus: (status: ProcessingStatus) => void
): Promise<FarmData> => {
  // Dokumentum feldolgozása Claude-dal
  let processResult;
  try {
    updateStatus({
      step: "Claude AI feldolgozás előkészítése",
      progress: 40,
      details: "A dokumentum Claude AI-val történő feldolgozása folyamatban..."
    });
    
    // Ellenőrizzük, hogy a fájl támogatott formátumú-e Claude-hoz
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isImageFormat = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
    
    if (!isImageFormat) {
      updateStatus({
        step: "Formátum konvertálása",
        progress: 45,
        details: "PDF formátum feldolgozása szövegként..."
      });
    }
    
    processResult = await processDocumentWithOpenAI(file, user);
    
    if (!processResult) {
      throw new Error("Hiba történt a dokumentum feldolgozása során");
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
        ocrText: farmData.rawText || ""
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
