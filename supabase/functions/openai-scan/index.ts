
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

    // Log API key status (without revealing the actual key)
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

    console.log(`📄 File received: ${file.name}, Size: ${file.size} bytes`);

    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();

    // Detailed logging of file upload attempt
    console.log('🚢 Attempting to upload file to OpenAI');
    const fileUploadStart = Date.now();

    try {
      // Create an Assistant first
      const assistant = await openai.beta.assistants.create({
        name: "SAPS Document Analyzer",
        instructions: "You are an expert at analyzing agricultural SAPS documents. Extract key information like land parcels, crop types, and agricultural details.",
        model: "gpt-4o-mini"
      });
      console.log(`✅ Assistant created. ID: ${assistant.id}`);

      // Upload file to OpenAI
      const uploadedFile = await openai.files.create({
        file: new File([fileBuffer], file.name, { type: file.type || 'application/pdf' }),
        purpose: "assistants"
      });

      const fileUploadTime = Date.now() - fileUploadStart;
      console.log(`✅ File uploaded successfully (${fileUploadTime}ms). File ID: ${uploadedFile.id}`);

      // Create a thread with the uploaded file
      const thread = await openai.beta.threads.create({
        messages: [{
          role: "user",
          content: "Analyze this SAPS document and extract all relevant agricultural information.",
          attachments: [{ file_id: uploadedFile.id }]
        }]
      });
      console.log(`✅ Thread created. ID: ${thread.id}`);

      // Return successful response with details
      return new Response(JSON.stringify({ 
        message: 'Document processed successfully', 
        fileId: uploadedFile.id,
        assistantId: assistant.id,
        threadId: thread.id
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (uploadError) {
      console.error('❌ Upload process error:', JSON.stringify({
        status: uploadError.status,
        message: uploadError.message,
        type: uploadError.type,
        code: uploadError.code,
        details: uploadError
      }));

      return new Response(JSON.stringify({ 
        error: 'Failed to process document', 
        details: uploadError.message,
        fullError: uploadError
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
