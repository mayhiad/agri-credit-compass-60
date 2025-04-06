
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
  const processResult = await processDocumentWithOpenAI(file, user);
  
  if (!processResult) {
    throw new Error("Hiba történt a dokumentum feldolgozása során");
  }
  
  const { threadId, runId } = processResult;
  
  updateStatus({
    step: "AI feldolgozás folyamatban",
    progress: 50,
    details: "Az AI feldolgozza a dokumentumot, ez akár 1-2 percet is igénybe vehet..."
  });
  
  let isComplete = false;
  let farmData: FarmData | null = null;
  let attempts = 0;
  const maxAttempts = 30;
  
  while (!isComplete && attempts < maxAttempts) {
    attempts++;
    
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    try {
      const resultData = await checkProcessingResults(threadId, runId);
      
      let progress = 50 + Math.min(40, attempts * 2);
      updateStatus({
        step: resultData.status === 'completed' ? "Dokumentum elemzése befejezve" : "AI feldolgozás folyamatban",
        progress: progress,
        details: `Feldolgozás: ${resultData.status || 'folyamatban'} (${attempts}. ellenőrzés)`
      });
      
      if (resultData.completed && resultData.data) {
        isComplete = true;
        farmData = resultData.data;
        break;
      }
    } catch (checkError) {
      console.error(`Eredmény ellenőrzési hiba (${attempts}. kísérlet):`, checkError);
    }
  }
  
  if (!isComplete || !farmData) {
    // Ha nem sikerült feldolgozni az AI-val, használjunk minta adatokat
    console.log("AI feldolgozás sikertelen, minta adatok használata helyette");
    farmData = generateFallbackFarmData(user.email || user.id, file.name, file.size);
    
    updateStatus({
      step: "Alapértelmezett adatok feldolgozása",
      progress: 100,
      details: `${farmData.blockIds?.length || 0} blokkazonosító, ${farmData.cultures.length} növénykultúra feldolgozva (minta adatok)`
    });
  } else {
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
  }
  
  return farmData;
};
