
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import OpenAI from 'https://esm.sh/openai@4.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAI({
  apiKey: openaiApiKey,
  defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
});

// API kérési timeout ms-ben (30 másodperc)
const API_TIMEOUT = 30000;

// Timeout-os fetch implementáció
const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('API request timed out');
    }
    throw error;
  }
};

async function processDocumentWithOpenAI(fileBuffer: ArrayBuffer, fileName: string, userId: string) {
  console.log(`🔍 Dokumentum feldolgozás megkezdése: ${fileName}`);
  console.log(`📦 Dokumentum mérete: ${fileBuffer.byteLength} bájt`);
  console.log(`🔑 OpenAI API kulcs állapota: ${openaiApiKey ? "beállítva (" + openaiApiKey.substring(0, 5) + "...)" : "hiányzik"}`);

  try {
    // Fájl feltöltése OpenAI-ba
    console.log("📤 Kísérlet fájl feltöltésére az OpenAI-ba...");
    const fileUploadStart = Date.now();
    
    const file = await openai.files.create({
      file: new File([fileBuffer], fileName, { type: 'application/pdf' }),
      purpose: "assistants"
    }).catch(error => {
      console.error("❌ Hiba a fájl feltöltése során:", JSON.stringify({
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code
      }));
      throw error;
    });
    
    const fileUploadTime = Date.now() - fileUploadStart;
    console.log(`✅ Fájl sikeresen feltöltve (${fileUploadTime}ms). File ID: ${file.id}`);

    // Asszisztens létrehozása
    console.log("🤖 Asszisztens létrehozása...");
    const assistantStart = Date.now();
    
    const assistant = await openai.beta.assistants.create({
      name: "SAPS Dokumentum Elemző",
      instructions: `Olvasd ki a dokumentumból a következő mezőket JSON formátumban:
        {
          "hectares": "Összes terület hektárban",
          "cultures": [
            {
              "name": "Kultúra neve",
              "hectares": "Kultúra területe",
              "estimatedRevenue": "Becsült árbevétel"
            }
          ],
          "totalRevenue": "Összes becsült árbevétel",
          "region": "Gazdaság régiója",
          "blockIds": ["Blokkazonosítók listája"]
        }`,
      tools: [{ type: "file_search" }],
      model: "gpt-4o-mini"
    }).catch(error => {
      console.error("❌ Hiba az asszisztens létrehozása során:", JSON.stringify({
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code
      }));
      throw error;
    });
    
    const assistantTime = Date.now() - assistantStart;
    console.log(`✅ Asszisztens létrehozva (${assistantTime}ms). ID: ${assistant.id}`);

    // Thread létrehozása
    console.log("📝 Thread létrehozása...");
    const threadStart = Date.now();
    
    const thread = await openai.beta.threads.create().catch(error => {
      console.error("❌ Hiba a thread létrehozása során:", JSON.stringify({
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code
      }));
      throw error;
    });
    
    const threadTime = Date.now() - threadStart;
    console.log(`✅ Thread létrehozva (${threadTime}ms). ID: ${thread.id}`);
    
    // Üzenet hozzáadása a thread-hez
    console.log(`📤 Üzenet létrehozása`);
    const messageStart = Date.now();
    
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Olvasd ki a SAPS dokumentum részleteit JSON formátumban.",
      file_ids: [file.id]  // A fájl azonosítóját itt adjuk át, a message létrehozásakor
    }).catch(error => {
      console.error("❌ Hiba az üzenet létrehozása során:", JSON.stringify({
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code
      }));
      throw error;
    });
    
    const messageTime = Date.now() - messageStart;
    console.log(`✅ Üzenet létrehozva (${messageTime}ms). ID: ${message.id}`);

    // Futtatás
    console.log(`🏃 Feldolgozás indítása asszisztens ID-val: ${assistant.id}`);
    const runStart = Date.now();
    
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
      // Ne add át itt a file_ids vagy tool_resources paramétert
    }).catch(error => {
      console.error("❌ Hiba a futtatás létrehozása során:", JSON.stringify({
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code
      }));
      throw error;
    });
    
    const runTime = Date.now() - runStart;
    console.log(`✅ Feldolgozás elindítva (${runTime}ms). Run ID: ${run.id}`);

    return {
      threadId: thread.id,
      runId: run.id,
      fileId: file.id
    };

  } catch (error) {
    console.error("🚨 Teljes feldolgozási hiba:", error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log("📥 Kérés érkezett: URL:", req.url, "Metódus:", req.method);
    console.log("📤 Kérés fejlécek:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('Nem érkezett fájl');

    console.log("📄 Fájl fogadva:", file.name, "méret:", file.size, "típus:", file.type);
    console.log("🔑 OpenAI API kulcs állapota:", openaiApiKey ? "beállítva (" + openaiApiKey.substring(0, 5) + "...)" : "hiányzik");

    const fileBuffer = await file.arrayBuffer();
    const processResult = await processDocumentWithOpenAI(fileBuffer, file.name, 'debug_user');

    return new Response(JSON.stringify(processResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Végső hibakezelés:", error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      details: error.toString(),
      stack: error.stack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
