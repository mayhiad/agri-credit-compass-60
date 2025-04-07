
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";

/**
 * Process document with AI (OpenAI/Claude)
 */
export const processDocumentWithAI = async (
  file: File, 
  user: any, 
  endpointUrl: string, 
  timeoutMs: number = 180000
): Promise<any> => {
  if (!user) {
    throw new Error("Nincs érvényes felhasználói munkamenet");
  }
  
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error("Nincs érvényes felhasználói munkamenet");
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  console.log(`📡 Küldés a Supabase ${endpointUrl} végpontra...`);
  
  const scanResponse = await fetch(
    `https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/${endpointUrl}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
      signal: AbortSignal.timeout(timeoutMs),
    }
  );
  
  if (!scanResponse.ok) {
    const errorText = await scanResponse.text();
    console.error(`${endpointUrl} hiba:`, errorText);
    let errorData;
    
    try {
      errorData = JSON.parse(errorText);
    } catch (parseError) {
      errorData = { error: errorText || "Ismeretlen hiba történt" };
    }
    
    throw new Error(errorData.error || "Hiba a dokumentum feldolgozása közben");
  }
  
  const scanData = await scanResponse.json();
  console.log(`${endpointUrl} válasz:`, scanData);
  
  return scanData;
};
