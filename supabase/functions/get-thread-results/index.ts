
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://esm.sh/openai@4.38.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Környezeti változók
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Inicializáljuk az OpenAI és Supabase klienseket
const openai = new OpenAI({ apiKey: openAIApiKey, defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' } });
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// CORS fejlécek
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JSON keresése a szövegben
function extractJsonFromContent(content: string): any {
  try {
    // Keressünk JSON-t a válaszban - gyakran code block-ban van
    const codeBlockMatches = content.match(/```(?:json)?\s*({[\s\S]*?})\s*```/);
    if (codeBlockMatches && codeBlockMatches[1]) {
      console.log("🔍 Found JSON in code block\n");
      const jsonText = codeBlockMatches[1];
      return JSON.parse(jsonText);
    }
    
    // Ha nem találtunk code block-ban, keressünk kapcsos zárójelek között
    const jsonMatches = content.match(/{[\s\S]*?}/);
    if (jsonMatches && jsonMatches[0]) {
      console.log("🔍 Found JSON between curly braces\n");
      return JSON.parse(jsonMatches[0]);
    }
    
    // Még egy próba - keresünk bármit, ami JSON-nek tűnhet
    const possibleJson = content.match(/({[\s\S]*})/);
    if (possibleJson && possibleJson[1]) {
      try {
        const parsed = JSON.parse(possibleJson[1]);
        console.log("🔍 Found possible JSON structure\n");
        return parsed;
      } catch (e) {
        console.log("❌ Failed to parse possible JSON\n");
      }
    }
    
    console.log("❌ No JSON found in content\n");
    return null;
  } catch (error) {
    console.error("❌ Error extracting JSON:", error);
    return null;
  }
}

// Eredmények elkérése és mentése
serve(async (req) => {
  console.log("🚀 Get Thread Results Function Started\n");
  
  // CORS kezelése
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  
  try {
    // Kérés adatainak kinyerése
    const requestData = await req.json();
    console.log("Request data:", JSON.stringify(requestData, null, 2));

    const { threadId, runId, ocrLogId } = requestData;
    
    if (!threadId || !runId) {
      throw new Error("A thread ID és run ID kötelező paraméterek");
    }
    
    // Run status ellenőrzése
    console.log(`📄 Checking status for Thread ID: ${threadId}, Run ID: ${runId}\n`);
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log(`🏃 Run status: ${run.status}\n`);
    
    // Felhasználói azonosító kinyerése a JWT tokenből
    let userId = 'system';
    
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // JWT token feldolgozása a userId kinyeréséhez
        const token = authHeader.split(' ')[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        if (payload.sub) {
          userId = payload.sub;
        }
      } catch (jwtError) {
        console.warn("⚠️ Nem sikerült a JWT tokent feldolgozni:", jwtError);
      }
    }
    
    // Alapértelmezett válasz
    let response = {
      completed: false,
      status: run.status,
      data: null,
      rawContent: null
    };
    
    // Ha befejeződött a futás, nézzük meg az eredményt
    if (run.status === 'completed') {
      // Üzenetek lekérése a thread-ből
      const messages = await openai.beta.threads.messages.list(threadId);
      console.log(`📩 Retrieved ${messages.data.length} messages from thread\n`);
      
      // Szűrés az asszisztens üzeneteire, fordított sorrendben (legújabb először)
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      console.log(`🤖 Found ${assistantMessages.length} assistant messages\n`);
      
      if (assistantMessages.length > 0) {
        // Vegyük a legutolsó választ
        const lastMessage = assistantMessages[0];
        
        // Egyszerűség kedvéért csak szöveges tartalmat kezelünk
        if (lastMessage.content[0].type === 'text') {
          const content = lastMessage.content[0].text.value;
          console.log(`📝 Message content: ${content.substring(0, 100)}...\n`);
          
          // Próbáljuk meg kinyerni a JSON-t a válaszból
          const extractedData = extractJsonFromContent(content);
          
          if (extractedData) {
            console.log("✅ Successfully parsed json data\n");
            response.data = extractedData;
            response.completed = true;
          }
          
          // A nyers választ is elmentsük
          response.rawContent = content;
        }
      }
      
      // Ha van OCR log ID, frissítsük az adatbázist az eredménnyel
      if (ocrLogId && response.completed) {
        try {
          const { error } = await supabase.from('document_extraction_results')
            .update({
              extracted_data: response.data || {},
              processing_status: 'completed',
              processing_time: Date.now() - new Date(run.created_at).getTime()
            })
            .eq('ocr_log_id', ocrLogId)
            .eq('thread_id', threadId)
            .eq('run_id', runId);
            
          if (error) {
            console.error("❌ Error updating extraction results in database:", error);
          } else {
            console.log("✅ Successfully updated extraction results in database\n");
          }
        } catch (dbError) {
          console.error("❌ Database error:", dbError);
        }
      } else if (ocrLogId && run.status === 'failed') {
        // Ha a futás sikertelen, frissítsük az adatbázist a megfelelő státusszal
        try {
          const { error } = await supabase.from('document_extraction_results')
            .update({
              extracted_data: { error: "AI processing failed" },
              processing_status: 'failed',
              processing_time: Date.now() - new Date(run.created_at).getTime()
            })
            .eq('ocr_log_id', ocrLogId)
            .eq('thread_id', threadId)
            .eq('run_id', runId);
            
          if (error) {
            console.error("❌ Error updating extraction failure in database:", error);
          } else {
            console.log("✅ Successfully updated extraction failure in database\n");
          }
        } catch (dbError) {
          console.error("❌ Database error:", dbError);
        }
      }
    }
    
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("❌ Error:", error);
    
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      details: error instanceof Error ? error.stack : JSON.stringify(error)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
