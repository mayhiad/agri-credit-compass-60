
import { FarmData } from "@/types/farm";
import { ProcessingStatus } from "@/types/processing";
import { supabase } from "@/integrations/supabase/client";
import { validateDocumentFile } from "@/services/documentValidation";
import { saveFarmDataToDatabase } from "@/services/farmDataService";
import { processDocumentWithAI } from "@/services/aiProcessingService";

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
  
  // Call our AI processing service
  try {
    const processResult = await processDocumentWithAI(file, user);
    
    if (!processResult) {
      throw new Error("Nem sikerült feldolgozni a dokumentumot");
    }
    
    // Update batch progress information from the response
    if (processResult.batchInfo) {
      updateStatus({
        step: "Claude AI feldolgozás befejezve",
        progress: 70,
        details: `Dokumentum feldolgozva (${processResult.batchInfo.processedBatches}/${processResult.batchInfo.totalBatches} köteg)`,
        processingId: processResult.processingId,
        claudeResponseUrl: processResult.claudeResponseUrl,
        rawClaudeResponse: processResult.rawClaudeResponse,
        claudeResponseTimestamp: new Date().toISOString(),
        batchProgress: {
          currentBatch: processResult.batchInfo.processedBatches,
          totalBatches: processResult.batchInfo.totalBatches,
          pagesProcessed: processResult.batchInfo.processedPages,
          totalPages: processResult.batchInfo.totalPages || 0
        }
      });
    }
    
    // Check if we got farm data
    if (!processResult.data) {
      throw new Error("Nem sikerült adatot kinyerni a dokumentumból");
    }
    
    let farmData: FarmData = processResult.data;
    
    // Add file metadata
    farmData.fileName = file.name;
    farmData.fileSize = file.size;
    farmData.processingStatus = 'completed';
    farmData.processingId = processResult.processingId;
    farmData.claudeResponseUrl = processResult.claudeResponseUrl;
    
    // Validate farm data
    const isDataValid = 
      farmData.applicantName && farmData.applicantName !== "N/A" &&
      farmData.submitterId && farmData.submitterId !== "N/A" &&
      farmData.applicantId && farmData.applicantId !== "N/A";
      
    if (!isDataValid) {
      // All fields are N/A values - no useful data extracted
      farmData.errorMessage = "Nem sikerült kinyerni a kulcsadatokat a dokumentumból. A Claude AI nem talált érvényes adatokat.";
    }
    
    // Save the farm data to the database
    updateStatus({
      step: "Adatok mentése az adatbázisba",
      progress: 95,
      details: "Ügyfél adatok rögzítése...",
      processingId: processResult.processingId,
      claudeResponseUrl: processResult.claudeResponseUrl,
      rawClaudeResponse: processResult.rawClaudeResponse,
      claudeResponseTimestamp: new Date().toISOString(),
      batchProgress: {
        currentBatch: processResult.batchInfo?.totalBatches || 0,
        totalBatches: processResult.batchInfo?.totalBatches || 0,
        pagesProcessed: processResult.batchInfo?.totalPages || 0,
        totalPages: processResult.batchInfo?.totalPages || 0
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
        details: `Dokumentumazonosító: ${processResult.processingId}, SAPS feldolgozás kész.`,
        processingId: processResult.processingId,
        claudeResponseUrl: processResult.claudeResponseUrl,
        rawClaudeResponse: processResult.rawClaudeResponse,
        claudeResponseTimestamp: new Date().toISOString(),
        batchProgress: {
          currentBatch: processResult.batchInfo?.totalBatches || 0,
          totalBatches: processResult.batchInfo?.totalBatches || 0,
          pagesProcessed: processResult.batchInfo?.totalPages || 0,
          totalPages: processResult.batchInfo?.totalPages || 0
        }
      });
      
      return farmData;
    } catch (error) {
      console.error("Hiba az adatok mentése során:", error);
      
      updateStatus({
        step: "Feldolgozás befejezve figyelmeztetéssel",
        progress: 100,
        details: "Adatok feldolgozva, de nem sikerült menteni az adatbázisba.",
        processingId: processResult.processingId,
        claudeResponseUrl: processResult.claudeResponseUrl,
        rawClaudeResponse: processResult.rawClaudeResponse,
        claudeResponseTimestamp: new Date().toISOString(),
        batchProgress: {
          currentBatch: processResult.batchInfo?.totalBatches || 0,
          totalBatches: processResult.batchInfo?.totalBatches || 0,
          pagesProcessed: processResult.batchInfo?.totalPages || 0,
          totalPages: processResult.batchInfo?.totalPages || 0
        }
      });
      
      return farmData;
    }
    
  } catch (error) {
    console.error("SAPS feldolgozási hiba:", error);
    throw error;
  }
};

// Re-export the ProcessingStatus type for backward compatibility
export type { ProcessingStatus } from "@/types/processing";
