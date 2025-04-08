
import { supabase } from "@/integrations/supabase/client";
import { saveOcrTextToWordDocument } from "@/utils/storageUtils";

export const processDocumentWithGoogleVision = async (file: File, user: any): Promise<{
  ocrLogId?: string;
  ocrText?: string;
  wordDocumentUrl?: string;
} | null> => {
  console.warn("🚨 processDocumentWithGoogleVision has been deprecated. This method is no longer supported.");
  
  throw new Error("Google Vision OCR processing is no longer available. Please use alternative document processing methods.");
};
