
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/components/LoanApplication";

export const processDocumentWithOpenAI = async (file: File, user: any): Promise<{
  threadId: string;
  runId: string;
  assistantId?: string;
  ocrLogId?: string;
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
    console.log("AI scan válasz:", scanData);
    
    const { threadId, runId, ocrLogId, assistantId } = scanData;
    
    if (!threadId || !runId) {
      throw new Error("Hiányzó thread vagy run azonosító");
    }
    
    return { threadId, runId, ocrLogId, assistantId };
  } catch (error) {
    console.error("Dokumentum feldolgozási hiba:", error);
    throw error;
  }
};

export const checkProcessingResults = async (threadId: string, runId: string, ocrLogId?: string): Promise<{ 
  completed: boolean;
  status: string;
  data?: FarmData;
  rawContent?: string;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Nincs érvényes felhasználói munkamenet");
    }
    
    console.log(`Eredmény ellenőrzése a thread ID-val: ${threadId}, run ID-val: ${runId}`);
    
    const resultResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/get-thread-results',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ threadId, runId, ocrLogId }),
        signal: AbortSignal.timeout(30000) // 30 másodperces időtúllépés az ellenőrzéshez
      }
    );
    
    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      console.warn(`Ellenőrzési hiba:`, errorText);
      return { completed: false, status: 'pending' };
    }
    
    const resultData = await resultResponse.json();
    console.log(`Eredmény ellenőrzés válasz:`, resultData);
    
    // Visszaadjuk a nyers AI választ is, hogy könnyebben lehessen debugolni
    return {
      completed: resultData.completed,
      status: resultData.status || 'pending',
      data: resultData.data,
      rawContent: resultData.rawContent
    };
  } catch (error) {
    console.error("Eredmény ellenőrzési hiba:", error);
    return { completed: false, status: 'error' };
  }
};

// Az RPC függvényhívásokat javítjuk TypeScript hibák miatt
export const getDocumentOcrLogs = async (): Promise<any[]> => {
  try {
    // Közvetlenül SQL lekérdezést használunk
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

// Az RPC függvényhívásokat javítjuk TypeScript hibák miatt
export const getExtractionResultById = async (logId: string): Promise<any | null> => {
  try {
    // Közvetlenül SQL lekérdezést használunk
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
