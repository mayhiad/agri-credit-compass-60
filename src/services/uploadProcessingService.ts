
import { FarmData } from "@/types/farm";
import { ProcessingStatus } from "@/types/processing";
import { supabase } from "@/integrations/supabase/client";
import { validateDocumentFile } from "@/services/documentValidation";
import { saveFarmDataToDatabase } from "@/services/farmDataService";
import { generateFallbackFarmData, validateAndFixFarmData } from "@/services/fallbackDataService";

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
  
  // Step 1: Convert PDF to images
  updateStatus({
    step: "PDF konvertálása képekké",
    progress: 20,
    details: "A dokumentum képekké konvertálása folyamatban...",
  });
  
  // Prepare form data for the conversion request
  const convertFormData = new FormData();
  convertFormData.append('file', file);
  convertFormData.append('userId', user.id);
  
  // Get the authentication token
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Nincs érvényes felhasználói munkamenet");
  }
  
  // Call our Supabase Edge Function to convert PDF to images
  try {
    console.log("Calling convert-pdf-to-images edge function...");
    
    // Create a custom AbortController with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 360000); // 6 minute timeout for large files
    
    const convertResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/convert-pdf-to-images',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: convertFormData,
        signal: controller.signal
      }
    ).finally(() => clearTimeout(timeoutId));
    
    if (!convertResponse.ok) {
      const errorText = await convertResponse.text();
      console.error("PDF konvertálási hiba:", errorText);
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: errorText || "Ismeretlen hiba történt" };
      }
      
      const errorMessage = errorData.error || "Hiba a dokumentum konvertálása közben";
      console.error(`PDF konvertálási hiba részletei: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    const convertData = await convertResponse.json();
    console.log("PDF konvertálás eredménye:", convertData);
    
    // Check if we got batch information
    if (!convertData.batchId || !convertData.pageCount) {
      throw new Error("A PDF konvertálás sikertelen volt, hiányzó batch információk");
    }
    
    const batchId = convertData.batchId;
    const pageCount = convertData.pageCount;
    const totalBatches = Math.ceil(pageCount / 20);
    
    updateStatus({
      step: "PDF konvertálás befejezve",
      progress: 30,
      details: `A dokumentum sikeresen konvertálva ${pageCount} képpé`,
      batchProgress: {
        currentBatch: 0,
        totalBatches: totalBatches,
        pagesProcessed: 0,
        totalPages: pageCount
      }
    });
    
    // Step 2: Process the images with Claude AI
    updateStatus({
      step: "Claude AI feldolgozás",
      progress: 40,
      details: "A dokumentum elemzése Claude AI segítségével...",
      batchProgress: {
        currentBatch: 1,
        totalBatches: totalBatches,
        pagesProcessed: Math.min(20, pageCount),
        totalPages: pageCount
      }
    });
    
    // Prepare the request payload
    const payload = {
      batchId: batchId,
      userId: user.id
    };
    
    console.log("Calling process-saps-document edge function with payload:", payload);
    
    // Create a custom AbortController with an even longer timeout for AI processing
    const aiController = new AbortController();
    const aiTimeoutId = setTimeout(() => aiController.abort(), 600000); // 10 minute timeout
    
    // Call the process-saps-document endpoint
    const processResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: aiController.signal
      }
    ).finally(() => clearTimeout(aiTimeoutId));
    
    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error("Claude feldolgozási hiba:", errorText);
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: errorText || "Ismeretlen hiba történt" };
      }
      
      const errorMessage = errorData.error || "Hiba a dokumentum feldolgozása során";
      console.error(`Claude feldolgozási hiba részletei: ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    const processResult = await processResponse.json();
    console.log("Claude feldolgozás eredménye:", processResult);
    
    // Update batch progress information from the response
    if (processResult.batchInfo) {
      updateStatus({
        step: "Claude AI feldolgozás befejezve",
        progress: 70,
        details: `Dokumentum feldolgozva (${processResult.batchInfo.processedBatches}/${processResult.batchInfo.totalBatches} köteg)`,
        batchProgress: {
          currentBatch: processResult.batchInfo.processedBatches,
          totalBatches: processResult.batchInfo.totalBatches,
          pagesProcessed: processResult.batchInfo.processedPages,
          totalPages: processResult.batchInfo.totalPages || pageCount
        }
      });
    }
    
    // Check if we got farm data
    if (!processResult.data) {
      throw new Error("Nem sikerült adatot kinyerni a dokumentumból");
    }
    
    let farmData: FarmData = processResult.data;
    
    // Add file metadata and batch information
    farmData.fileName = file.name;
    farmData.fileSize = file.size;
    farmData.batchId = batchId;
    farmData.pageCount = pageCount;
    farmData.processingStatus = 'completed';
    
    // Check if the farm data is incomplete
    if (!farmData.applicantName || !farmData.submitterId || !farmData.applicantId) {
      console.warn("A Claude által feldolgozott adatok hiányosak:", farmData);
      
      updateStatus({
        step: "Alapértelmezett adatok generálása",
        progress: 85,
        details: "Az AI nem tudott elegendő adatot kinyerni, példa adatok generálása...",
        batchProgress: {
          currentBatch: totalBatches,
          totalBatches: totalBatches,
          pagesProcessed: pageCount,
          totalPages: pageCount
        }
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
        batchId: batchId,
        pageCount: pageCount,
        processingStatus: 'completed'
      };
    }
    
    // Additional validation and fix missing fields
    farmData = validateAndFixFarmData(farmData);
    
    // Save the farm data to the database
    updateStatus({
      step: "Adatok mentése az adatbázisba",
      progress: 95,
      details: "Ügyfél adatok rögzítése...",
      batchProgress: {
        currentBatch: totalBatches,
        totalBatches: totalBatches,
        pagesProcessed: pageCount,
        totalPages: pageCount
      }
    });
    
    try {
      const farmId = await saveFarmDataToDatabase(farmData, user.id);
      
      if (farmId) {
        // Update the farm data with the farm ID
        farmData.farmId = farmId;
      }
      
      updateStatus({
        step: "Feldolgozás befejezve",
        progress: 100,
        details: `Ügyfél-azonosító: ${farmData.submitterId || "Ismeretlen"}, Név: ${farmData.applicantName || "Ismeretlen"} sikeresen feldolgozva és mentve.`,
        batchProgress: {
          currentBatch: totalBatches,
          totalBatches: totalBatches,
          pagesProcessed: pageCount,
          totalPages: pageCount
        }
      });
      
      return farmData;
    } catch (error) {
      console.error("Hiba az adatok mentése során:", error);
      
      updateStatus({
        step: "Feldolgozás befejezve figyelmeztetéssel",
        progress: 100,
        details: "Adatok feldolgozva, de nem sikerült menteni az adatbázisba.",
        batchProgress: {
          currentBatch: totalBatches,
          totalBatches: totalBatches,
          pagesProcessed: pageCount,
          totalPages: pageCount
        }
      });
      
      return farmData;
    }
    
  } catch (error) {
    console.error("SAPS feltöltési hiba:", error);
    
    // Check for network errors specifically
    if (error.name === 'AbortError') {
      throw new Error("A kérés időtúllépés miatt megszakadt. A dokumentum túl nagy lehet vagy a szerver túlterhelt.");
    } else if (error.message === 'Failed to fetch') {
      throw new Error("Hálózati hiba - Nem sikerült kapcsolódni a szerverhez. Ellenőrizze az internetkapcsolatot.");
    }
    
    throw error;
  }
};

// Re-export the ProcessingStatus type for backward compatibility
export type { ProcessingStatus } from "@/types/processing";
