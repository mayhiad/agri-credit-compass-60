
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
    console.log('🚀 OpenAI Scan Function Started');
    
    // Log request details for debugging
    console.log('Request URL:', req.url);
    console.log('Request Method:', req.method);
    console.log('Request Headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      console.error('❌ OpenAI API Key is missing');
      return new Response(JSON.stringify({ error: 'OpenAI API Key is not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('🔑 OpenAI API Key status: Configured');

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      defaultHeaders: { 'OpenAI-Beta': 'assistants=v2' }
    });

    // Parse incoming form data
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('❌ No file uploaded');
      return new Response(JSON.stringify({ error: 'No file uploaded' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`📄 File received: ${file.name}, Size: ${file.size} bytes, Type: ${file.type}`);

    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Detailed logging of file upload attempt
    console.log('🚢 Attempting to upload file to OpenAI');
    const fileUploadStart = Date.now();

    try {
      // Use existing assistant instead of creating a new one
      const assistantId = "asst_O4mDtAf0vkjjbm4hUbB0gTD4";
      console.log(`✅ Using existing assistant ID: ${assistantId}`);

      // Upload file to OpenAI
      const uploadedFile = await openai.files.create({
        file: new File([fileBuffer], file.name, { type: file.type || 'application/pdf' }),
        purpose: "assistants"
      });

      const fileUploadTime = Date.now() - fileUploadStart;
      console.log(`✅ File uploaded successfully (${fileUploadTime}ms). File ID: ${uploadedFile.id}`);

      // Create a thread
      const thread = await openai.beta.threads.create();
      console.log(`✅ Thread created. ID: ${thread.id}`);
      
      // Add a message to the thread WITHOUT the file attached (per OpenAI v2 API)
      console.log(`📤 Creating message with instructions (without file attachment)`);
      
      const messageContent = `
Elemezd ezt a SAPS dokumentumot és nyerd ki belőle az összes releváns mezőgazdasági információt. 
Az adatokat a következő JSON formátumban add vissza:
{
  "applicantName": "A gazdálkodó neve",
  "documentId": "Dokumentum/kérelem azonosító",
  "region": "Régió neve",
  "year": "Az év, amelyre a dokumentum vonatkozik",
  "hectares": 123.45,
  "cultures": [
    {
      "name": "Kukorica",
      "hectares": 45.6,
      "yieldPerHectare": 8.2,
      "pricePerTon": 72000,
      "estimatedRevenue": 26913600
    },
    {
      "name": "Búza",
      "hectares": 77.85,
      "yieldPerHectare": 5.5,
      "pricePerTon": 85000,
      "estimatedRevenue": 36378375
    }
  ],
  "blockIds": ["L12AB-1-23", "K45CD-6-78"],
  "totalRevenue": 63291975
}

Minden kultúrához becsüld meg a termésátlagot és az árakat, ha nem találod a dokumentumban!
A termésátlag (yieldPerHectare) tonna/hektár értékben, az ár (pricePerTon) Ft/tonna értékben legyen megadva.
A becsült bevételt (estimatedRevenue) számold ki a kultúra × termésátlag × ár képlettel.
A teljes bevételt (totalRevenue) számold ki az összes kultúra becsült bevételének összegeként.`;
      
      // Create message without file attachment
      const message = await openai.beta.threads.messages.create(thread.id, {
        role: "user",
        content: messageContent
      });
      
      console.log(`✅ Message created with ID: ${message.id}`);
      
      // Run the assistant on the thread WITH file attachment in the run itself (per OpenAI v2 API)
      console.log(`🏃 Starting run with assistant ID: ${assistantId} and file ID: ${uploadedFile.id}`);
      const runStart = Date.now();
      
      // Using correct v2 API structure: pass file in tool_resources
      const run = await openai.beta.threads.runs.create(
        thread.id,
        { 
          assistant_id: assistantId,
          tool_resources: {
            file_search: {
              file_ids: [uploadedFile.id]
            }
          }
        }
      );
      
      console.log(`✅ Run created. ID: ${run.id}`);
      
      // Return successful response with details (we're not waiting for completion in this function)
      return new Response(JSON.stringify({ 
        message: 'Document processing started', 
        fileId: uploadedFile.id,
        assistantId: assistantId,
        threadId: thread.id,
        runId: run.id,
        status: 'processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (uploadError) {
      console.error('❌ Upload process error:', JSON.stringify({
        status: uploadError.status,
        message: uploadError.message,
        type: uploadError.type,
        code: uploadError.code,
        param: uploadError.param,
        details: uploadError
      }));

      return new Response(JSON.stringify({ 
        error: 'Failed to process document', 
        details: uploadError.message,
        code: uploadError.code,
        param: uploadError.param
      }), {
        status: uploadError.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('🔥 Unhandled error in OpenAI Scan Function:', error);

    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      fullError: error
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
