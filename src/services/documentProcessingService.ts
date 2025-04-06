
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/components/LoanApplication";

export const processDocumentWithOpenAI = async (file: File, user: any): Promise<{
  threadId: string;
  runId: string;
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
    console.log("OpenAI scan válasz:", scanData);
    
    const { threadId, runId } = scanData;
    
    if (!threadId || !runId) {
      throw new Error("Hiányzó thread vagy run azonosító");
    }
    
    return { threadId, runId };
  } catch (error) {
    console.error("Dokumentum feldolgozási hiba:", error);
    throw error;
  }
};

export const checkProcessingResults = async (threadId: string, runId: string): Promise<{ 
  completed: boolean;
  status: string;
  data?: FarmData;
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
        body: JSON.stringify({ threadId, runId }),
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
    
    // Ha van rawContent, de nincs formázott data, akkor előállítunk egy alap FarmData objektumot
    // Ez egy fallback, ha az AI nem tudott strukturált adatokat visszaadni
    if (resultData.completed && resultData.status === 'completed' && !resultData.data) {
      // Minta adatok használata, ha nincs érvényes válasz az AI-tól
      console.log("Nincs érvényes strukturált adat, fallback adatok létrehozása");
      
      return {
        completed: true,
        status: 'completed',
        data: null // Nem állítunk elő itt adatokat, ezt később a feldolgozó kezelni fogja
      };
    }
    
    return {
      completed: resultData.completed,
      status: resultData.status || 'pending',
      data: resultData.data
    };
  } catch (error) {
    console.error("Eredmény ellenőrzési hiba:", error);
    return { completed: false, status: 'error' };
  }
};
