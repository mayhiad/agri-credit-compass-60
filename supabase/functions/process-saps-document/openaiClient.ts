
import OpenAI from 'https://esm.sh/openai@4.38.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Környezeti változók
const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Kliens inicializálás
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
export const openai = new OpenAI({
  apiKey: openaiApiKey,
  defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
});

// Konfiguráció ellenőrzése
export function validateConfig() {
  // OpenAI API kulcs ellenőrzése
  if (!openaiApiKey) {
    throw new Error('OpenAI API kulcs nincs beállítva');
  }
  
  // Supabase konfiguráció ellenőrzése
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase konfigurációs adatok hiányoznak');
  }
  
  return true;
}

// Segédfüggvény a hibakezeléshez
export function getErrorDetails(error: any): string {
  try {
    if (error.response) {
      // OpenAI API hibaválasz feldolgozása
      return `Státusz: ${error.response.status}, Hibaüzenet: ${error.response.data?.error?.message || JSON.stringify(error.response.data)}`;
    } else if (error.message) {
      return error.message;
    } else {
      return JSON.stringify(error);
    }
  } catch (e) {
    return "Nem sikerült feldolgozni a hibaüzenetet";
  }
}
