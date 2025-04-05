
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
    
    // Üzenet hozzáadása a thread-hez - a fájl nélkül
    console.log(`📤 Üzenet létrehozása (fájl hivatkozás nélkül)`);
    const messageStart = Date.now();
    
    const message = await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Olvasd ki a SAPS dokumentum részleteit JSON formátumban."
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

    // Futtatás - a fájl azonosítót itt adjuk át a tool_resources-ban
    console.log(`🏃 Feldolgozás indítása asszisztens ID-val: ${assistant.id} és fájl ID-val: ${file.id}`);
    const runStart = Date.now();
    
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id,
      tool_resources: {
        file_search: {
          file_ids: [file.id]
        }
      }
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

    // Várunk a befejezésig max 10x
    let runStatus: string;
    const maxAttempts = 10;
    let finalRunDetails: any = null;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`⏱️ ${attempt}. próbálkozás a futtatás állapotának ellenőrzésére...`);
      const statusStart = Date.now();
      
      const retrievedRun = await openai.beta.threads.runs.retrieve(
        thread.id, 
        run.id
      ).catch(error => {
        console.error(`❌ Hiba a ${attempt}. állapotellenőrzés során:`, JSON.stringify({
          status: error.status,
          message: error.message,
          type: error.type,
          code: error.code
        }));
        throw error;
      });
      
      const statusTime = Date.now() - statusStart;
      runStatus = retrievedRun.status;
      finalRunDetails = retrievedRun;
      
      console.log(`🕒 ${attempt}. próbálkozás - Státusz: ${runStatus} (${statusTime}ms)`);

      if (runStatus === 'completed') {
        console.log("✅ Feldolgozás sikeresen befejeződött!");
        break;
      }
      
      if (runStatus === 'failed') {
        console.error("❌ Feldolgozás sikertelen", JSON.stringify(retrievedRun));
        throw new Error(`Feldolgozás sikertelen: ${retrievedRun.last_error?.message}`);
      }

      if (attempt === maxAttempts) {
        console.warn(`⚠️ Elértük a maximum próbálkozások számát (${maxAttempts}), de a feldolgozás nem fejeződött be.`);
        console.warn("Utolsó ismert állapot:", JSON.stringify(finalRunDetails));
      }

      // 3 másodperc várakozás a következő próbálkozás előtt
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Üzenetek lekérése
    console.log("📬 Üzenetek lekérése a threadből...");
    const messagesStart = Date.now();
    
    const messages = await openai.beta.threads.messages.list(thread.id).catch(error => {
      console.error("❌ Hiba az üzenetek lekérése során:", JSON.stringify({
        status: error.status,
        message: error.message,
        type: error.type,
        code: error.code
      }));
      throw error;
    });
    
    const messagesTime = Date.now() - messagesStart;
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    
    console.log(`📬 Érkezett asszisztensi üzenetek (${messagesTime}ms): ${assistantMessages.length}`);

    // Tartalom kinyerése
    const extractedContent = assistantMessages
      .map(msg => msg.content[0].type === 'text' ? msg.content[0].text.value : null)
      .filter(Boolean);

    console.log("📋 Nyers kivont tartalom:", extractedContent);

    // JSON konvertálás
    const jsonData = extractedContent.reduce((acc, content) => {
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        const parsedJson = jsonMatch 
          ? JSON.parse(jsonMatch[1]) 
          : JSON.parse(content);
        return { ...acc, ...parsedJson };
      } catch (parseError) {
        console.warn("❗ JSON parsing hiba:", parseError);
        return acc;
      }
    }, {});

    console.log("🔍 Feldolgozott JSON:", jsonData);

    // Diagnosztikai adatok mentése
    await supabase.from('diagnostic_logs').insert({
      user_id: userId,
      file_name: fileName,
      file_size: fileBuffer.byteLength,
      extraction_data: jsonData,
      created_at: new Date().toISOString()
    });

    console.log("✅ Diagnosztikai adatok sikeresen mentve");

    return jsonData;

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
    const processedData = await processDocumentWithOpenAI(fileBuffer, file.name, 'debug_user');

    return new Response(JSON.stringify(processedData), {
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
