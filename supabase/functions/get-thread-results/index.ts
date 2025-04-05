
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from 'https://esm.sh/openai@4.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Get Thread Results Function Started');
    
    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('❌ OpenAI API Key is missing');
      return new Response(JSON.stringify({ error: 'OpenAI API Key is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Initialize OpenAI client with v2 API header
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
    });

    // Parse request body for thread and run IDs
    const requestData = await req.json();
    console.log('Request data:', requestData);
    
    const { threadId, runId } = requestData;
    
    // Ellenőrizzük, hogy a threadId és runId értékek meg vannak-e adva
    if (!threadId) {
      console.error('❌ Thread ID hiányzik');
      return new Response(JSON.stringify({ 
        error: 'Thread ID kötelező', 
        completed: false,
        timestamp: new Date().toISOString()
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📄 Checking status for Thread ID: ${threadId}, Run ID: ${runId || 'Not provided'}`);

    try {
      // Ha a runId meg van adva, ellenőrizzük az állapotát
      if (runId) {
        const run = await openai.beta.threads.runs.retrieve(threadId, runId);
        
        console.log(`🏃 Run status: ${run.status}`);
        
        // Külön kezeljük a hiba állapotot
        if (run.status === 'failed') {
          return new Response(JSON.stringify({ 
            status: 'failed',
            completed: false,
            error: run.last_error?.message || 'Ismeretlen hiba történt a futtatás során',
            code: run.last_error?.code,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Ha a run még folyamatban van, visszaadjuk az állapotát
        if (run.status !== 'completed') {
          return new Response(JSON.stringify({ 
            status: run.status,
            completed: false,
            timestamp: new Date().toISOString()
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Lekérjük az üzeneteket a thread-ből
      const messages = await openai.beta.threads.messages.list(threadId);
      
      console.log(`📩 Retrieved ${messages.data.length} messages from thread`);
      
      // Szűrjük az asszisztens üzenetekre
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      console.log(`🤖 Found ${assistantMessages.length} assistant messages`);
      
      if (assistantMessages.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'No assistant responses found in thread',
          completed: false,
          timestamp: new Date().toISOString()
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // A legfrissebb asszisztens üzenet tartalmának kinyerése
      const latestMessage = assistantMessages[0];
      let content = '';
      
      if (latestMessage.content && latestMessage.content.length > 0 && latestMessage.content[0].type === 'text') {
        content = latestMessage.content[0].text.value;
        console.log(`📝 Message content: ${content.substring(0, 100)}...`);
      }
      
      // Próbáljunk meg JSON adatot kinyerni az üzenet tartalmából
      let jsonData = {};
      let dataFormat = 'unknown';
      
      try {
        // JSON kód blokk keresése különböző formátumokra
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        const yamlMatch = content.match(/```ya?ml\s*([\s\S]*?)\s*```/);
        const xmlMatch = content.match(/```xml\s*([\s\S]*?)\s*```/);
        
        if (jsonMatch) {
          console.log(`🔍 Found JSON in code block`);
          jsonData = JSON.parse(jsonMatch[1]);
          dataFormat = 'json';
        } else if (yamlMatch) {
          console.log(`🔍 Found YAML in code block`);
          // YAML parsing helyettesítő (valós implementációhoz YAML parser szükséges)
          jsonData = { rawYAML: yamlMatch[1] };
          dataFormat = 'yaml';
        } else if (xmlMatch) {
          console.log(`🔍 Found XML in code block`);
          // XML parsing helyettesítő (valós implementációhoz XML parser szükséges)
          jsonData = { rawXML: xmlMatch[1] };
          dataFormat = 'xml';
        } else {
          // Próbáljuk meg az egész tartalmat JSON-ként értelmezni
          console.log(`🔍 Attempting to parse entire content as JSON`);
          jsonData = JSON.parse(content);
          dataFormat = 'json';
        }
        
        console.log(`✅ Successfully parsed ${dataFormat} data`);
      } catch (e) {
        console.warn('⚠️ Could not parse structured data from message content:', e);
        // Ha a parsing sikertelen, visszaadjuk a nyers tartalmat
        jsonData = { rawContent: content };
        dataFormat = 'raw';
      }
      
      return new Response(JSON.stringify({
        status: 'completed',
        completed: true,
        data: jsonData,
        dataFormat: dataFormat,
        rawContent: content,
        message_id: latestMessage.id,
        thread_id: threadId,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Error retrieving thread results:', error);
      
      // Részletesebb hibaüzenetek a különböző hibatípusokra
      let errorMessage = 'Failed to retrieve thread results';
      let errorStatus = 500;
      
      if (error.status === 404) {
        errorMessage = `Resource not found: ${error.message || 'thread or run was not found'}`;
        errorStatus = 404;
      } else if (error.message.includes('timed out')) {
        errorMessage = 'Request timed out while retrieving results';
        errorStatus = 408;
      } else if (error.status === 401 || error.status === 403) {
        errorMessage = 'Authorization error: ' + (error.message || 'invalid API key or permissions');
        errorStatus = error.status;
      }
      
      return new Response(JSON.stringify({ 
        error: errorMessage, 
        details: error.message,
        completed: false,
        timestamp: new Date().toISOString()
      }), {
        status: errorStatus,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('🔥 Unhandled error in Get Thread Results Function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
