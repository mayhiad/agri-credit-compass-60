import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/components/LoanApplication";
import { saveOcrTextToWordDocument } from "@/utils/storageUtils";

export const processDocumentWithOpenAI = async (file: File, user: any): Promise<{
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

export const checkProcessingResults = async (threadId?: string, runId?: string, ocrLogId?: string): Promise<{ 
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
    
    // Ha nincs threadId és runId, akkor nem kell ellenőrizni
    if (!threadId || !runId) {
      return { completed: true, status: 'completed' };
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

export const getDocumentOcrLogs = async (): Promise<any[]> => {
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

export const getExtractionResultById = async (logId: string): Promise<any | null> => {
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

export const processDocumentWithGoogleVision = async (file: File, user: any): Promise<{
  ocrLogId?: string;
  ocrText?: string;
  wordDocumentUrl?: string;
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
    
    console.log("📡 Küldés a Supabase process-document-with-vision végpontra...");
    
    const scanResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-document-with-vision',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
        signal: AbortSignal.timeout(120000), // 2 perc időtúllépés
      }
    );
    
    if (!scanResponse.ok) {
      const errorText = await scanResponse.text();
      console.error("Google Vision OCR hiba:", errorText);
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { error: errorText || "Ismeretlen hiba történt" };
      }
      
      throw new Error(errorData.error || "Hiba a dokumentum szkennelése közben");
    }
    
    const scanData = await scanResponse.json();
    console.log("Google Vision OCR válasz:", scanData);
    
    const { ocrLogId, ocrText } = scanData;
    
    let wordDocumentUrl = null;
    if (ocrText && ocrText.length > 0) {
      const originalFilename = file.name.split('.')[0];
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const wordFileName = `${originalFilename}_ocr_${timestamp}.docx`;
      
      wordDocumentUrl = await saveOcrTextToWordDocument(ocrText, wordFileName, user.id, ocrLogId);
      console.log("Word dokumentum létrehozva:", wordDocumentUrl);
    }
    
    return { ocrLogId, ocrText, wordDocumentUrl };
  } catch (error) {
    console.error("Google Vision OCR hiba:", error);
    throw error;
  }
};
