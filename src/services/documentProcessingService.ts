
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";
import { processDocumentWithAI } from "./aiProcessingService";
import { fetchProcessingResults } from "./processingResultsService";
import { getOcrLogs, getExtractionResult } from "./ocrLogsService";

// Re-export services to maintain backward compatibility
export const processDocumentWithOpenAI = processDocumentWithAI;
export const checkProcessingResults = fetchProcessingResults;
export const getDocumentOcrLogs = getOcrLogs;
export const getExtractionResultById = getExtractionResult;
