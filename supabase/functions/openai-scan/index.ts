
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
NAGYON FONTOS! OLVASD EL ALAPOSAN ÉS KÖVESD PONTOSAN AZ UTASÍTÁSOKAT!

Elemezd ezt a SAPS dokumentumot és nyerd ki belőle a mezőgazdasági információkat.

A FELADAT: A feltöltött SAPS dokumentumból ki kell nyerned a következő információkat:
1. A gazdálkodó neve
2. A dokumentum azonosítója
3. A régió (megye) neve
4. Az összes növénykultúra neve és területe hektárban
5. Minden kultúrához reális termésátlag (t/ha) értéket és piaci árat (Ft/t) kell rendelned

KÖVETELMÉNYEK:
1. MINDEN SZÁMSZERŰ ÉRTÉKNEK NAGYOBBNAK KELL LENNIE NULLÁNÁL - ez különösen fontos a hektár, termésátlag és ár adatoknál!
2. Ha a dokumentumból nem tudod kiolvasni a pontos hektárszámot egy kultúrához, akkor NE HASZNÁLJ KITALÁLT ADATOT, hanem hagyj ki azt a kultúrát.
3. A termésátlag (yieldPerHectare) értékeknek reális magyar értékeknek kell lenniük (pl. búza: 5-6 t/ha, kukorica: 7-9 t/ha)
4. A piaci áraknak (pricePerTon) aktuális magyarországi áraknak kell lenniük (pl. búza: ~80-90ezer Ft/t, kukorica: ~70-75ezer Ft/t)
5. Az árbevétel számítása: hektár × termésátlag × ár képlettel történik minden kultúrára
6. A teljes árbevétel az összes kultúra árbevételének összege
7. TILTOTT A RANDOM ADATOK GENERÁLÁSA! Csak valós, a dokumentumból kiolvasott vagy ahhoz kapcsolódó reális adatokat használj!
8. Ha nem tudod kiolvasni az adatokat, akkor inkább hagyj üres adatstruktúrát, de NE adj meg kitalált értékeket!

Az adatokat a következő JSON formátumban add vissza:
{
  "applicantName": "A gazdálkodó neve",
  "documentId": "Dokumentum/kérelem azonosító",
  "region": "Régió neve (megye)",
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

FIGYELEM! Ne generálj véletlenszerű adatokat! Ha nem találod az információt a dokumentumban, akkor inkább használj üres listát vagy nullát, de ne találj ki adatokat!

FELDOLGOZÁSI ELŐFELTÉTEL: A dokumentumnak tartalmaznia kell legalább egy növénykultúrát és területadatot, különben nem feldolgozható.

HA NEM TUDOD KINYERNI A SZÜKSÉGES ADATOKAT, AZT JELEZD EGYÉRTELMŰEN, de adj vissza egy üres adatstruktúrát a megadott formátumban.`;
      
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
