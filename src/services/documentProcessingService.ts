
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/components/LoanApplication";

// Process document with OpenAI
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
    
    console.log("Dokumentum feltöltése az OpenAI funkcióhoz...");
    const scanResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      }
    );
    
    if (!scanResponse.ok) {
      const errorData = await scanResponse.json();
      console.error("SAPS dokumentum feltöltési hiba:", errorData);
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

// Check processing results
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
        body: JSON.stringify({ threadId, runId })
      }
    );
    
    if (!resultResponse.ok) {
      const errorText = await resultResponse.text();
      console.warn(`Ellenőrzési hiba:`, errorText);
      return { completed: false, status: 'pending' };
    }
    
    const resultData = await resultResponse.json();
    console.log(`Eredmény ellenőrzés válasz:`, resultData);
    
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
