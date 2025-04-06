
import { FarmData } from "@/components/LoanApplication";
import { supabase } from "@/integrations/supabase/client";
import { processDocumentWithOpenAI, checkProcessingResults } from "@/services/documentProcessingService";
import { uploadFileToStorage } from "@/utils/storageUtils";
import { generateFallbackFarmData, validateAndFixFarmData } from "@/services/fallbackDataService";

export type ProcessingStatus = {
  step: string;
  progress: number;
  details?: string;
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
  
  // Dokumentum feldolgozása OpenAI-val
  let processResult;
  try {
    processResult = await processDocumentWithOpenAI(file, user);
    
    if (!processResult) {
      throw new Error("Hiba történt a dokumentum feldolgozása során");
    }
  } catch (error) {
    console.error("OpenAI feldolgozási hiba:", error);
    throw new Error(`Az AI feldolgozás sikertelen volt: ${error.message || "Ismeretlen hiba"}`);
  }
  
  const { threadId, runId } = processResult;
  
  updateStatus({
    step: "AI feldolgozás folyamatban",
    progress: 50,
    details: "Az AI feldolgozza a dokumentumot, ez akár 2-3 percet is igénybe vehet..."
  });
  
  let isComplete = false;
  let farmData: FarmData | null = null;
  let attempts = 0;
  const maxAttempts = 90; // Növeljük a próbálkozások számát 90-re (~7.5 perc összesen)
  const waitTimeMs = 5000; // 5 másodperc várakozás próbálkozások között
  
  // Várjunk az eredményre
  while (!isComplete && attempts < maxAttempts) {
    attempts++;
    
    await new Promise(resolve => setTimeout(resolve, waitTimeMs));
    
    try {
      const resultData = await checkProcessingResults(threadId, runId);
      
      let progress = 50 + Math.min(40, Math.floor((attempts / maxAttempts) * 40));
      updateStatus({
        step: resultData.status === 'completed' ? "Dokumentum elemzése befejezve" : "AI feldolgozás folyamatban",
        progress: progress,
        details: `Feldolgozás: ${resultData.status || 'folyamatban'} (${attempts}/${maxAttempts}. ellenőrzés)`
      });
      
      if (resultData.completed && resultData.data) {
        isComplete = true;
        farmData = resultData.data;
        
        // Validáljuk az adatokat és győződjünk meg róla, hogy nem nulla értékek
        if (!farmData.hectares || farmData.hectares <= 0 || 
            !farmData.cultures || farmData.cultures.length === 0 ||
            !farmData.totalRevenue || farmData.totalRevenue <= 0) {
          
          console.warn("Az AI által feldolgozott adatok hiányosak vagy nullák:", farmData);
          
          // Jelezzük a felhasználónak, hogy hiányos adatok vannak
          updateStatus({
            step: "Hiányos adatok",
            progress: 70,
            details: "Az AI által kinyert adatok hiányosak. Újbóli feldolgozás..."
          });
          
          // Újra próbáljuk a feldolgozást, ha még van hátralévő próbálkozás
          if (attempts < maxAttempts - 5) {
            isComplete = false;
            farmData = null;
            continue;
          }
          
          throw new Error("A dokumentumból nem sikerült érvényes adatokat kinyerni. Kérjük, ellenőrizze a feltöltött dokumentumot.");
        }
        
        break;
      }
    } catch (checkError) {
      console.error(`Eredmény ellenőrzési hiba (${attempts}. kísérlet):`, checkError);
      
      // Csak a maximális próbálkozások után dobjunk hibát
      if (attempts >= maxAttempts) {
        throw new Error("Nem sikerült feldolgozni a dokumentumot a megadott időn belül. Az eddigi folyamat mentve van, próbálja meg újra később.");
      }
    }
  }
  
  // Ha nem sikerült feldolgozni az AI-val, állítsunk elő fallback adatokat
  if (!isComplete || !farmData) {
    console.warn("AI feldolgozás sikertelen, fallback adatok generálása...");
    farmData = generateFallbackFarmData(user.id, file.name, file.size);
    
    updateStatus({
      step: "Feldolgozás sikertelen",
      progress: 90,
      details: "Nem sikerült az adatokat kinyerni. Alapértelmezett adatok előállítása..."
    });
  }
  
  // Add file metadata
  farmData.fileName = file.name;
  farmData.fileSize = file.size;
  
  // További validáció és hiányzó mezők pótlása
  farmData = validateAndFixFarmData(farmData);
  
  updateStatus({
    step: "Adatok feldolgozása",
    progress: 90,
    details: `${farmData.blockIds?.length || 0} blokkazonosító, ${farmData.cultures?.length || 0} növénykultúra feldolgozva`
  });
  
  return farmData;
};
