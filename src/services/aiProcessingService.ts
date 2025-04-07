
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";
import { saveOcrTextToWordDocument } from "@/utils/storageUtils";

export const processDocumentWithAI = async (file: File, user: any): Promise<{
  threadId?: string;
  runId?: string;
  assistantId?: string;
  ocrLogId?: string;
  data?: FarmData;
  status?: string;
  batchInfo?: any;
} | null> => {
  try {
    if (!user) {
      throw new Error("Nincs érvényes felhasználói munkamenet");
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Nincs érvényes felhasználói munkamenet");
    }
    
    // First, we need to convert the PDF to images using our edge function
    const convertFormData = new FormData();
    convertFormData.append('file', file);
    convertFormData.append('userId', user.id);
    
    console.log("📡 Küldés a Supabase convert-pdf-to-images végpontra...");
    
    const convertResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/convert-pdf-to-images',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: convertFormData,
        signal: AbortSignal.timeout(300000), // 5 perc időtúllépés
      }
    );
    
    if (!convertResponse.ok) {
      const errorText = await convertResponse.text();
      console.error("PDF konvertálási hiba:", errorText);
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: errorText || "Ismeretlen hiba történt" };
      }
      
      throw new Error(errorData.error || "Hiba a dokumentum konvertálása közben");
    }
    
    const convertData = await convertResponse.json();
    console.log("PDF konvertálás eredménye:", convertData);
    
    // Check if we got batch information
    if (!convertData.batchId || !convertData.pageCount) {
      throw new Error("A PDF konvertálás sikertelen volt, hiányzó batch információk");
    }
    
    // Now process the converted images with Claude AI
    console.log("📡 Küldés a Supabase process-saps-document végpontra...");
    
    // Prepare the request for Claude processing
    const processRequest = {
      batchId: convertData.batchId,
      userId: user.id
    };
    
    const processResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(processRequest),
        signal: AbortSignal.timeout(180000), // 3 perc időtúllépés
      }
    );
    
    if (!processResponse.ok) {
      const errorText = await processResponse.text();
      console.error("Claude feldolgozási hiba:", errorText);
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: errorText || "Ismeretlen hiba történt" };
      }
      
      throw new Error(errorData.error || "Hiba a dokumentum feldolgozása során");
    }
    
    const processResult = await processResponse.json();
    console.log("Claude feldolgozás eredménye:", processResult);
    
    // Check if there was an error in the processing
    if (processResult.error) {
      console.error("Claude feldolgozási hiba:", processResult.error);
      throw new Error(processResult.error);
    }
    
    // If we got data back but there was an error mentioned, log it but continue
    if (processResult.data?.errorMessage) {
      console.warn("Claude feldolgozási figyelmeztetés:", processResult.data.errorMessage);
    }
    
    // Claude feldolgozás már a visszatérő adatban van
    return { 
      ocrLogId: processResult.ocrLogId,
      data: processResult.data,
      status: processResult.status || 'completed',
      batchInfo: processResult.batchInfo
    };
  } catch (error) {
    console.error("Dokumentum feldolgozási hiba:", error);
    throw error;
  }
};
