
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from "https://esm.sh/openai@4.38.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const openai = new OpenAI({
  apiKey: openaiApiKey,
  defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("🚀 Get Thread Results Function Started");
    
    const requestData = await req.json();
    console.log("Request data:", JSON.stringify(requestData));

    const { threadId, runId, ocrLogId } = requestData;
    
    if (!threadId || !runId) {
      return new Response(
        JSON.stringify({ error: "Thread ID és Run ID megadása kötelező" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📄 Checking status for Thread ID: ${threadId}, Run ID: ${runId}`);
    
    // Ellenőrizzük a futtatás állapotát
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    console.log(`🏃 Run status: ${run.status}`);

    // Ha a futtatás még nem fejeződött be
    if (run.status !== 'completed' && run.status !== 'failed' && run.status !== 'cancelled') {
      return new Response(
        JSON.stringify({ 
          completed: false, 
          status: run.status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ha sikertelen volt a futtatás
    if (run.status === 'failed' || run.status === 'cancelled') {
      console.error(`❌ Run failed or cancelled. Status: ${run.status}`);
      
      if (ocrLogId) {
        try {
          // Frissítsük az adatbázist a feldolgozás sikertelenségével
          const { error } = await supabase
            .from('document_extraction_results')
            .update({ 
              processing_status: 'failed',
              processing_time: Date.now()
            })
            .eq('ocr_log_id', ocrLogId);
          
          if (error) {
            console.error("❌ Error updating extraction results:", error);
          }
        } catch (dbError) {
          console.error("❌ Database error:", dbError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          completed: true, 
          status: 'failed',
          error: run.status === 'failed' ? run.last_error : 'Run was cancelled'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ha sikeresen befejeződött, lekérjük az üzeneteket
    const messages = await openai.beta.threads.messages.list(threadId);
    console.log(`📩 Retrieved ${messages.data.length} messages from thread`);
    
    // Keressük az asszisztens üzenetét (az első válasz az utolsó üzenet)
    const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
    console.log(`🤖 Found ${assistantMessages.length} assistant messages`);
    
    if (assistantMessages.length === 0) {
      return new Response(
        JSON.stringify({ 
          completed: true, 
          status: 'completed',
          error: 'No assistant messages found'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the most recent assistant message
    const latestMessage = assistantMessages[0];
    const textContent = latestMessage.content.filter(content => content.type === 'text');
    
    if (textContent.length === 0) {
      return new Response(
        JSON.stringify({ 
          completed: true, 
          status: 'completed',
          error: 'No text content in assistant message' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the text content
    const content = textContent[0].text.value;
    console.log(`📝 Message content: ${content.substring(0, 100)}...`);
    
    // Extract JSON data from the message
    let extractedData = null;
    const jsonPattern = /```json\s*([^`]+)\s*```/;
    const match = content.match(jsonPattern);
    
    if (match && match[1]) {
      console.log(`🔍 Found JSON in code block`);
      try {
        extractedData = JSON.parse(match[1].trim());
        console.log(`✅ Successfully parsed json data`);
      } catch (jsonError) {
        console.error("❌ Error parsing JSON:", jsonError);
      }
    }

    // Mentsük az eredményeket az adatbázisba, ha van ocrLogId
    if (ocrLogId) {
      try {
        // Frissítsük az adatbázist a feldolgozás eredményével
        const { error } = await supabase
          .from('document_extraction_results')
          .update({ 
            extracted_data: extractedData || {},
            processing_status: 'completed',
            processing_time: Date.now() // Ez INTEGER, nem BIGINT, ezért túlcsordulhat
          })
          .eq('ocr_log_id', ocrLogId);
        
        if (error) {
          console.error("❌ Error updating extraction results in database:", error);
        }
      } catch (dbError) {
        console.error("❌ Database error:", dbError);
      }
    }

    // Return the final response
    return new Response(
      JSON.stringify({ 
        completed: true, 
        status: 'completed',
        data: extractedData,
        rawContent: content
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error(`❌ Unhandled error in get-thread-results function:`, error);
    
    return new Response(
      JSON.stringify({ 
        completed: false, 
        status: 'error',
        error: error.message || 'Unknown error'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
