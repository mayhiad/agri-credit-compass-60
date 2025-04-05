
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import OpenAI from 'https://esm.sh/openai@4.38.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
    });

    // Parse request body for thread and run IDs
    const { threadId, runId } = await req.json();
    
    if (!threadId) {
      return new Response(JSON.stringify({ error: 'Thread ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📄 Checking status for Thread ID: ${threadId}, Run ID: ${runId || 'Not provided'}`);

    try {
      // If runId is provided, check its status
      if (runId) {
        const run = await openai.beta.threads.runs.retrieve(threadId, runId);
        
        console.log(`🏃 Run status: ${run.status}`);
        
        // If the run is still in progress, return the status
        if (run.status !== 'completed') {
          return new Response(JSON.stringify({ 
            status: run.status,
            completed: false
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Retrieve messages from the thread
      const messages = await openai.beta.threads.messages.list(threadId);
      
      // Filter for assistant messages only
      const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
      
      if (assistantMessages.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'No assistant responses found in thread',
          completed: false
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Extract content from the most recent assistant message
      const latestMessage = assistantMessages[0];
      let content = '';
      
      if (latestMessage.content[0].type === 'text') {
        content = latestMessage.content[0].text.value;
      }
      
      // Try to extract JSON data from the message content
      let jsonData = {};
      try {
        // Look for JSON content (may be in a code block)
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonData = JSON.parse(jsonMatch[1]);
        } else {
          // Try to parse the entire content as JSON
          jsonData = JSON.parse(content);
        }
      } catch (e) {
        console.warn('⚠️ Could not parse JSON from message content:', e);
        // Return the raw content if parsing fails
        jsonData = { rawContent: content };
      }
      
      return new Response(JSON.stringify({
        status: 'completed',
        completed: true,
        data: jsonData,
        rawContent: content
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      console.error('❌ Error retrieving thread results:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to retrieve thread results', 
        details: error.message,
        completed: false
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('🔥 Unhandled error in Get Thread Results Function:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
