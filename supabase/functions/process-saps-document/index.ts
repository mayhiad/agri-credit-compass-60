
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

  try {
    // Fájl feltöltése OpenAI-ba
    const file = await openai.files.create({
      file: new File([fileBuffer], fileName, { type: 'application/pdf' }),
      purpose: "assistants"
    });
    console.log(`📤 Fájl sikeresen feltöltve. File ID: ${file.id}`);

    // Asszisztens létrehozása
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
      model: "gpt-4o",
      file_ids: [file.id]
    });
    console.log(`🤖 Asszisztens létrehozva. ID: ${assistant.id}`);

    // Thread létrehozása
    const thread = await openai.beta.threads.create();
    console.log(`📝 Thread létrehozva. ID: ${thread.id}`);
    
    // Üzenet hozzáadása a thread-hez
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: "Olvasd ki a SAPS dokumentum részleteit JSON formátumban.",
      file_ids: [file.id]  // Itt adjuk át a file_id-t
    });
    console.log(`📤 Üzenet létrehozva a file_id-val: ${file.id}`);

    // Futtatás
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistant.id
    });
    console.log(`🏃 Feldolgozás elindítva. Run ID: ${run.id}`);

    // Várunk a befejezésig max 10x
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

      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Üzenetek lekérése
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    
    console.log(`📬 Érkezett asszisztensi üzenetek: ${assistantMessages.length}`);

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
