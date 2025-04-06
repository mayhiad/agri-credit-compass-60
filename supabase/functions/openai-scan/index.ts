
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
KRITIKUSAN FONTOS! OLVASD EL FIGYELMESEN ÉS KÖVESD PONTOSAN AZ UTASÍTÁSOKAT!

SAPS mezőgazdasági dokumentum feldolgozása: Feladatod a feltöltött dokumentumból automatikusan kinyerni és strukturálni a mezőgazdasági adatokat.

ALAPVETŐ KÖVETELMÉNY:
- Ne találj ki adatokat! Ha nem találod meg a dokumentumban, hagyd üresen vagy nullára állítva
- Sose generálj véletlenszerű adatokat!
- Ha nem tudsz kinyerni minden adatot, akkor is jelezd, hogy mely adatokat sikerült kinyerned

A következő adatokat kell kinyerned:
1. Gazdálkodó neve (applicantName)
2. Dokumentum azonosító (documentId): minden SAPS dokumentumnak van egyedi azonosítója
3. Régió (region): Megye vagy település
4. Év (year): Amely évre a dokumentum vonatkozik
5. Összes földterület hektárban (hectares) - CSAK POZITÍV SZÁMOK LEHETNEK!
6. Növénykultúrák adatai - CSAK POZITÍV SZÁMOK LEHETNEK!
   - Kultúra neve (name): pl. búza, kukorica, napraforgó
   - Területe hektárban (hectares): CSAK POZITÍV SZÁMOK LEHETNEK!
   - Becsült termésátlag (yieldPerHectare): t/ha - CSAK POZITÍV SZÁMOK LEHETNEK!
   - Becsült egységár (pricePerTon): Ft/t - CSAK POZITÍV SZÁMOK LEHETNEK!
   - Becsült bevétel (estimatedRevenue): hectares × yieldPerHectare × pricePerTon
7. Blokkazonosítók (blockIds): a dokumentumban található egyedi azonosítók

Várható JSON formátum:
{
  "applicantName": "string vagy null, ha nem található",
  "documentId": "string vagy null, ha nem található",
  "region": "string vagy null, ha nem található",
  "year": "string vagy null, ha nem található",
  "hectares": number > 0 vagy 0, ha nem található,
  "cultures": [
    {
      "name": "string",
      "hectares": number > 0,
      "yieldPerHectare": number > 0,
      "pricePerTon": number > 0,
      "estimatedRevenue": number > 0
    }
  ],
  "blockIds": ["string"] vagy [], ha nem található,
  "totalRevenue": number > 0 vagy 0, ha nem található
}

Ha egyáltalán nem sikerül adatokat kinyerned, adj vissza egy üres objektumot:
{
  "applicantName": null,
  "documentId": null,
  "region": null,
  "year": null,
  "hectares": 0,
  "cultures": [],
  "blockIds": [],
  "totalRevenue": 0
}

FONTOS: Ha a dokumentumban nem találhatók növénykultúrák adatai legalább 10 hektár összes területtel, vagy nem lehet kinyerni a fő mezőgazdasági adatokat, akkor az adatkinyerés sikertelennek tekintendő. Ilyen esetben jelezd, hogy sikertelen volt az adatkinyerés.`;
      
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
