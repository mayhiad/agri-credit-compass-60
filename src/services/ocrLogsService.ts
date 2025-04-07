
import { supabase } from "@/integrations/supabase/client";

/**
 * Get all OCR processing logs
 */
export const getOcrLogs = async (): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('document_ocr_logs')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error("Hiba az OCR naplók lekérésekor:", error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error("Váratlan hiba az OCR naplók lekérésekor:", error);
    return [];
  }
};

/**
 * Get extraction result by OCR log ID
 */
export const getExtractionResult = async (logId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('document_extraction_results')
      .select('*')
      .eq('ocr_log_id', logId)
      .single();
      
    if (error) {
      console.error("Hiba a feldolgozási eredmény lekérésekor:", error);
      return null;
    }
    
    return data || null;
  } catch (error) {
    console.error("Váratlan hiba a feldolgozási eredmény lekérésekor:", error);
    return null;
  }
};
