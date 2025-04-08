
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";
import { processDocumentWithAI } from "./aiProcessingService";
import { fetchProcessingResults } from "./processingResultsService";
import { getOcrLogs, getExtractionResult } from "./ocrLogsService";
import { processDocumentWithGoogleVision } from "./visionProcessingService";

// Re-export services to maintain backward compatibility
export const processDocumentWithOpenAI = processDocumentWithAI;
export const checkProcessingResults = fetchProcessingResults;
export const getDocumentOcrLogs = getOcrLogs;
export const getExtractionResultById = getExtractionResult;
export { processDocumentWithGoogleVision };

// New function to check API connectivity
export const checkApiConnectivity = async (): Promise<boolean> => {
  try {
    const response = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document',
      {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    // If we get any response at all, we have connectivity
    return response.status === 204 || response.ok;
  } catch (error) {
    console.error("API connectivity check failed:", error);
    return false;
  }
};
