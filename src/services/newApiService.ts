
import { supabase } from "@/integrations/supabase/client";

/**
 * Az új API szolgáltatás hívása a Supabase Edge Function-ön keresztül
 * @param data Az API-nak küldendő adatok
 * @returns API válasz, amely tartalmazza a sikeres/sikertelen állapotot és az adatokat vagy hibaüzenetet
 */
export const callNewApiService = async (data: any = {}) => {
  try {
    const { data: response, error } = await supabase.functions.invoke('new-api-service', {
      body: JSON.stringify(data),
    });

    if (error) {
      console.error("Edge Function hívási hiba:", error);
      throw new Error(`Edge Function hívási hiba: ${error.message}`);
    }

    return response;
  } catch (error) {
    console.error("API hívási hiba:", error);
    throw error;
  }
};
