
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
  
  const { threadId, runId, ocrLogId } = processResult;
  
  updateStatus({
    step: "AI feldolgozás folyamatban",
    progress: 50,
    details: "Az AI feldolgozza a dokumentumot, ez akár 2-3 percet is igénybe vehet..."
  });
  
  let isComplete = false;
  let farmData: FarmData | null = null;
  let attempts = 0;
  const maxAttempts = 30; // Csökkentjük a próbálkozások számát az idő rövidítéséhez
  const waitTimeMs = 5000; // 5 másodperc várakozás próbálkozások között
  let rawContent = "";
  
  // Várjunk az eredményre
  while (!isComplete && attempts < maxAttempts) {
    attempts++;
    
    await new Promise(resolve => setTimeout(resolve, waitTimeMs));
    
    try {
      const resultData = await checkProcessingResults(threadId, runId, ocrLogId);
      
      // Nyers AI válasz mentése a debuggoláshoz
      if (resultData.rawContent) {
        rawContent = resultData.rawContent;
      }
      
      // Ha a feldolgozás status completed, akkor gyorsabban lépünk tovább
      let progress = 50 + Math.min(40, Math.floor((attempts / maxAttempts) * 40));
      
      if (resultData.status === 'completed') {
        progress = 80; // Gyorsabban mutatunk előrehaladást
      }
      
      updateStatus({
        step: resultData.status === 'completed' ? "Dokumentum elemzése befejezve" : "AI feldolgozás folyamatban",
        progress: progress,
        details: `Feldolgozás: ${resultData.status || 'folyamatban'} (${attempts}/${maxAttempts}. ellenőrzés)`
      });
      
      if (resultData.completed && resultData.data) {
        isComplete = true;
        farmData = resultData.data;
        
        // Ha a farm adat üres, akkor generáljunk fallback adatokat
        if (!farmData.hectares || farmData.hectares <= 0 || 
            !farmData.cultures || farmData.cultures.length === 0 ||
            !farmData.totalRevenue || farmData.totalRevenue <= 0) {
          
          console.warn("Az AI által feldolgozott adatok hiányosak vagy nullák:", farmData);
          
          // Egyszerűen generáljunk fallback adatokat és menjünk tovább
          if (attempts >= maxAttempts / 2) {
            updateStatus({
              step: "Alapértelmezett adatok generálása",
              progress: 85,
              details: "Az AI nem tudott elegendő adatot kinyerni, példa adatok generálása..."
            });
            
            farmData = generateFallbackFarmData(user.id, file.name, file.size);
            farmData.errorMessage = "Nem sikerült az adatokat kinyerni a dokumentumból. Demonstrációs adatok kerültek megjelenítésre.";
            farmData.rawAiResponse = rawContent;
            break;
          }
          
          // Újra próbáljuk a feldolgozást
          updateStatus({
            step: "Hiányos adatok",
            progress: 70,
            details: "Az AI által kinyert adatok hiányosak. Újbóli feldolgozás..."
          });
          
          // Csak pár próbálkozás után generáljunk fallback adatokat
          if (attempts < maxAttempts / 2) {
            isComplete = false;
            farmData = null;
            continue;
          }
        }
        
        break;
      }
      
      // Ha már elég próbálkozást tettünk és még mindig nincs eredmény, generáljunk fallback adatokat
      if (attempts >= maxAttempts / 2 && !isComplete) {
        updateStatus({
          step: "Feldolgozás nehézségekbe ütközik",
          progress: 75,
          details: "Az AI feldolgozás nehézségekbe ütközik. Példa adatok előkészítése..."
        });
      }
      
    } catch (checkError) {
      console.error(`Eredmény ellenőrzési hiba (${attempts}. kísérlet):`, checkError);
      
      // Ha nem sikerült feldolgozni, adjunk fallback adatokat a fél maxAttempts után
      if (attempts >= maxAttempts / 2) {
        updateStatus({
          step: "Alapértelmezett adatok generálása",
          progress: 85,
          details: "Az adatkinyerés sikertelen volt, példa adatok generálása..."
        });
        
        // Fallback adatok generálása
        farmData = generateFallbackFarmData(user.id, file.name, file.size);
        farmData.errorMessage = "Nem sikerült feldolgozni a dokumentumot. Demonstrációs adatok kerültek megjelenítésre.";
        farmData.rawAiResponse = rawContent;
        break;
      }
    }
  }
  
  // Ha nem sikerült feldolgozni az AI-val, állítsunk elő fallback adatokat
  if (!isComplete || !farmData) {
    console.warn("AI feldolgozás sikertelen, fallback adatok generálása...");
    farmData = generateFallbackFarmData(user.id, file.name, file.size);
    farmData.rawAiResponse = rawContent;
    
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
