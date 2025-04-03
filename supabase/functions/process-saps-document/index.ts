
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

// Részletes diagnosztikai logging hozzáadása
async function processDocumentWithOpenAI(fileBuffer: ArrayBuffer, fileName: string, userId: string) {
  console.log(`🔍 Dokumentum feldolgozás megkezdése: ${fileName}`);
  console.log(`📦 Dokumentum mérete: ${fileBuffer.byteLength} bájt`);

  try {
    // Fájl feltöltés részletes logolása
    const file = await openai.files.create({
      file: new File([fileBuffer], fileName),
      purpose: "assistants"
    });
    console.log(`📤 Fájl sikeresen feltöltve. File ID: ${file.id}`);

    // Asszisztens létrehozás diagnosztikai adatokkal
    const assistant = await openai.beta.assistants.create({
      name: "SAPS Dokumentum Elemző Diagnosztika",
      instructions: `
        DIAGNOSZTIKAI MINTA:
        Részletes JSON kibontás a dokumentumból:
        {
          "debug": {
            "fileSize": "${fileBuffer.byteLength}",
            "fileName": "${fileName}"
          },
          "applicantName": "Kérelmező teljes neve",
          "cultures": [
            {
              "name": "Kultúra neve",
              "hectares": "Terület nagysága",
              "detailedInfo": "Opcionális részletek"
            }
          ]
        }
      `,
      tools: [{ type: "retrieval" }],
      model: "gpt-4o",
      file_ids: [file.id]
    });
    console.log(`🤖 Asszisztens létrehozva. ID: ${assistant.id}`);

    // Thread és üzenet létrehozás diagnosztikai céllal
    const thread = await openai.beta.threads.create();
    console.log(`📝 Thread létrehozva. ID: ${thread.id}`);

    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `
        DIAGNOSZTIKAI FELDOLGOZÁS:
        1. Olvasd ki a dokumentum összes lehetséges adatát
        2. Részletes JSON formátum
        3. Debug információk feltüntetése
      `,
      file_ids: [file.id]
    });

    // Futtatás és részletes állapotkövetés
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });

    console.log(`🏃 Feldolgozás elindítva. Run ID: ${run.id}`);

    // Futtatás állapotának részletes nyomonkövetése
    let runStatus: string;
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const retrievedRun = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      runStatus = retrievedRun.status;
      
      console.log(`🕒 ${attempt}. próbálkozás - Státusz: ${runStatus}`);

      if (runStatus === 'completed') break;
      if (runStatus === 'failed') {
        console.error("❌ Feldolgozás sikertelen", retrievedRun);
        throw new Error(`Feldolgozás sikertelen: ${retrievedRun.last_error?.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 3000)); // Hosszabb várakozási idő
    }

    // Üzenetek lekérése részletes logolással
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    
    console.log(`📬 Érkezett asszisztensi üzenetek: ${assistantMessages.length}`);

    const extractedContent = assistantMessages
      .map(msg => msg.content[0].type === 'text' ? msg.content[0].text.value : null)
      .filter(Boolean);

    console.log("📋 Nyers kivont tartalom:", extractedContent);

    // Robusztus JSON kibontás
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

    // Diagnosztikai adatok mentése Supabase-be
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
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('Nem érkezett fájl');

    const fileBuffer = await file.arrayBuffer();
    const processedData = await processDocumentWithOpenAI(fileBuffer, file.name, 'debug_user');

    return new Response(JSON.stringify(processedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Végső hibakezelés:", error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      details: error.toString() 
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
