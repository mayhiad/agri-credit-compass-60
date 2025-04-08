
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";

/**
 * Checks processing results for a thread/run
 */
export const fetchProcessingResults = async (threadId?: string, runId?: string, ocrLogId?: string): Promise<{ 
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
