
import { supabase } from "@/integrations/supabase/client";
import { saveOcrTextToWordDocument } from "@/utils/storageUtils";

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
