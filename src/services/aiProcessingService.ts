
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
} | null> => {
  try {
    if (!user) {
      throw new Error("Nincs érvényes felhasználói munkamenet");
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Nincs érvényes felhasználói munkamenet");
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    console.log("📡 Küldés a Supabase process-saps-document végpontra...");
    
    const scanResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
        signal: AbortSignal.timeout(180000), // 3 perc időtúllépés
      }
    );
    
    if (!scanResponse.ok) {
      const errorText = await scanResponse.text();
      console.error("SAPS dokumentum feltöltési hiba:", errorText);
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: errorText || "Ismeretlen hiba történt" };
      }
      
      throw new Error(errorData.error || "Hiba a dokumentum feldolgozása közben");
    }
    
    const scanData = await scanResponse.json();
    console.log("Claude scan válasz:", scanData);
    
    // Claude feldolgozás már a visszatérő adatban van
    return { 
      ocrLogId: scanData.ocrLogId,
      data: scanData.data,
      status: scanData.status || 'completed'
    };
  } catch (error) {
    console.error("Dokumentum feldolgozási hiba:", error);
    throw error;
  }
};
