
// Main edge function entry point for SAPS document processing
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processDocumentWithClaude } from "./claudeProcessor.ts";
import { corsHeaders, handleCors } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to check internet connectivity
async function checkConnectivity() {
  try {
    const response = await fetch('https://www.google.com', { 
      method: 'HEAD',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });
    return response.ok;
  } catch (error) {
    console.error(`❌ Connectivity check failed: ${error.message}`);
    return false;
  }
}

serve(async (req) => {
  try {
    // Add start timestamp for logging
    const startTime = new Date();
    
    // Diagnostic logging for EVERY request
    console.log(`🔍 New request received: ${req.method} ${new URL(req.url).pathname} at ${startTime.toISOString()}`);
    console.log(`🔓 Edge function environment: SUPABASE_URL set: ${Boolean(Deno.env.get('SUPABASE_URL'))}, ANTHROPIC_API_KEY set: ${Boolean(Deno.env.get('ANTHROPIC_API_KEY'))}`);
    
    // Handle CORS preflight requests
    const corsResponse = handleCors(req);
    if (corsResponse) {
      console.log(`🔄 Responding to OPTIONS preflight request`);
      return corsResponse;
    }
    
    // Add CORS headers to all responses
    const headers = {
      'Content-Type': 'application/json',
      ...corsHeaders
    };
    
    if (req.method !== 'POST') {
      console.log(`⚠️ Method not allowed: ${req.method}`);
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers }
      );
    }
    
    // Quick connectivity check to verify internet access
    const isConnected = await checkConnectivity();
    if (!isConnected) {
      console.error('❌ Internet connectivity check failed');
      return new Response(
        JSON.stringify({ 
          error: 'A szervernek nincs internet kapcsolata. Kérjük ellenőrizze a hálózati beállításokat.',
          details: 'Edge function cannot access the internet'
        }),
        { status: 503, headers }
      );
    }
    
    // Parse the request body
    let requestData;
    try {
      requestData = await req.json();
      console.log("✅ Request data parsed successfully:", JSON.stringify(requestData));
    } catch (parseError) {
      console.error("❌ Error parsing request JSON:", parseError.message);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body', details: parseError.message }),
        { status: 400, headers }
      );
    }
    
    // Validate required fields
    if (!requestData.batchId || !requestData.userId) {
      console.log("⚠️ Missing required fields in request");
      return new Response(
        JSON.stringify({ error: 'Missing required fields: batchId and userId are required' }),
        { status: 400, headers }
      );
    }
    
    console.log(`📝 Processing batch ${requestData.batchId} for user ${requestData.userId}`);
    
    // Get batch information from database
    let batchData;
    try {
      const { data, error } = await supabase
        .from('document_batches')
        .select('*')
        .eq('batch_id', requestData.batchId)
        .eq('user_id', requestData.userId)
        .single();
      
      if (error) throw error;
      batchData = data;
      console.log(`📊 Found batch information: ${batchData ? 'Yes' : 'No'}`);
    } catch (batchError) {
      console.error("❌ Batch retrieval error:", batchError.message);
      return new Response(
        JSON.stringify({ error: 'Could not find batch information', details: batchError.message }),
        { status: 404, headers }
      );
    }
    
    if (!batchData) {
      return new Response(
        JSON.stringify({ error: 'Batch not found' }),
        { status: 404, headers }
      );
    }
    
    // Get all images for this batch
    let images;
    try {
      const { data, error } = await supabase
        .storage
        .from('dokumentumok')
        .list(`saps/${requestData.userId}/${requestData.batchId}/images`);
      
      if (error) throw error;
      images = data;
      console.log(`🖼️ Found ${images?.length || 0} files in storage`);
    } catch (storageError) {
      console.error("❌ Storage error:", storageError.message);
      return new Response(
        JSON.stringify({ error: 'Could not retrieve images from storage', details: storageError.message }),
        { status: 500, headers }
      );
    }
    
    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images found for processing' }),
        { status: 400, headers }
      );
    }
    
    // Get public URLs for all images
    const imageUrls = images
      .filter(file => file.name && file.name.endsWith('.jpg'))  // Only include JPG images
      .map(file => {
        const publicUrl = supabase.storage
          .from('dokumentumok')
          .getPublicUrl(`saps/${requestData.userId}/${requestData.batchId}/images/${file.name}`);
        return publicUrl.data.publicUrl;
      });
    
    console.log(`📊 Processing ${imageUrls.length} images for batch ${requestData.batchId}`);
    
    if (imageUrls.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No JPG images found for processing' }),
        { status: 400, headers }
      );
    }
    
    // Process images with Claude AI
    try {
      console.log(`🤖 Starting Claude AI processing at ${new Date().toISOString()}`);
      
      const result = await processDocumentWithClaude(imageUrls, requestData.userId, requestData.batchId);
      
      console.log(`✅ Claude processing completed successfully at ${new Date().toISOString()}`);
      console.log(`⏱️ Total processing time: ${(new Date().getTime() - startTime.getTime()) / 1000} seconds`);
      
      // Return the result
      return new Response(
        JSON.stringify(result),
        { status: 200, headers }
      );
    } catch (processingError) {
      console.error(`❌ Claude processing error: ${processingError.message}`);
      console.error(`Stack trace: ${processingError.stack || 'No stack trace available'}`);
      
      // Check for connectivity issues
      if (processingError.message.includes("HTML instead of JSON") || 
          processingError.message.includes("Failed to fetch") ||
          processingError.message.includes("network") ||
          processingError.message.includes("connection")) {
        return new Response(
          JSON.stringify({ 
            error: 'Hálózati kapcsolódási probléma a Claude AI szolgáltatáshoz. Kérjük ellenőrizze az internetkapcsolatot.', 
            details: processingError.message
          }),
          { status: 503, headers }
        );
      }
      
      // Check for specific error types
      if (processingError.message.includes("overloaded") || processingError.message.includes("529")) {
        return new Response(
          JSON.stringify({ 
            error: 'Claude AI szolgáltatás túlterhelt, kérjük próbálja később', 
            details: processingError.message
          }),
          { status: 503, headers }
        );
      }
      
      if (processingError.message.includes("rate limit") || processingError.message.includes("429")) {
        return new Response(
          JSON.stringify({ 
            error: 'Claude API kérések korlátozva, kérjük próbálja később', 
            details: processingError.message
          }),
          { status: 429, headers }
        );
      }
      
      // Generic error response
      return new Response(
        JSON.stringify({ 
          error: 'Hiba történt a dokumentum feldolgozása során', 
          details: processingError.message
        }),
        { status: 500, headers }
      );
    }
  } catch (error) {
    console.error(`❌ Unhandled error in edge function: ${error.message}`);
    console.error(`Stack trace: ${error.stack || 'No stack trace available'}`);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  }
});
