
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { corsHeaders, handleCors } from "./cors.ts";
import { processDocumentWithOpenAI } from "./processDocument.ts";
import { API_TIMEOUT } from "./fetchUtils.ts";
import { getClaudeModel } from "./apiClient.ts";
import { createSupabaseClient } from "./openaiClient.ts";

// Required environment variables
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  console.log(`⏱️ Function timeout set to ${API_TIMEOUT / 1000} seconds`);

  try {
    // Parse the request body
    let requestData;
    
    try {
      requestData = await req.json();
      console.log(`📦 Request data: ${JSON.stringify({
        ...requestData,
        // Don't log the full batch for security
        hasBatchId: !!requestData.batchId,
        testMode: !!requestData.testMode
      })}`);
    } catch (jsonError) {
      console.error("⚠️ Failed to parse request JSON:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Check for test mode - just verify API connectivity
    if (requestData.testMode === true) {
      console.log("🧪 Test mode detected, checking Claude API availability");
      
      try {
        // Simple test to see if Claude API is available
        const model = await getClaudeModel();
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Claude API is accessible", 
            model: model 
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (apiError) {
        console.error("❌ Claude API test failed:", apiError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: "Claude API is not accessible", 
            details: apiError.message 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract data from the request
    const { batchId, userId } = requestData;

    // Validate required fields
    if (!batchId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: batchId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: userId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the batch information
    console.log(`🔍 Looking up batch: ${batchId}`);
    const { data: batchData, error: batchError } = await supabase
      .from("document_batches")
      .select("*")
      .eq("batch_id", batchId)
      .eq("user_id", userId)
      .single();

    if (batchError) {
      console.error("❌ Error fetching batch:", batchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch batch information", details: batchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the image URLs for the batch
    console.log(`📷 Fetching image URLs for batch: ${batchId}`);
    const { data: imageUrls, error: storageError } = await supabase.storage
      .from("document-images")
      .list(`${userId}/${batchId}`);

    if (storageError) {
      console.error("❌ Error fetching images:", storageError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch images", details: storageError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate public URLs for all images
    console.log(`🔗 Generating public URLs for ${imageUrls.length} images`);
    
    // Only include image files (check extension for safety)
    const validImageUrls = imageUrls
      .filter(file => 
        file.name.endsWith(".jpg") || 
        file.name.endsWith(".jpeg") || 
        file.name.endsWith(".png")
      )
      .map(file => {
        const { data } = supabase.storage
          .from("document-images")
          .getPublicUrl(`${userId}/${batchId}/${file.name}`);
        return data.publicUrl;
      });

    if (validImageUrls.length === 0) {
      console.error("❌ No valid images found in the batch");
      return new Response(
        JSON.stringify({ error: "No valid images found in the batch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Found ${validImageUrls.length} valid images for processing`);

    // Process the document with Claude AI
    console.log(`🧠 Starting document processing with Claude AI for user: ${userId}`);
    const result = await processDocumentWithOpenAI(validImageUrls, userId, batchId);
    console.log(`✅ Claude AI processing complete. Result status: ${result.status}`);

    // Return the processing result
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("🚨 Unhandled exception in process-saps-document function:", error);
    
    // Try to extract a meaningful error message
    let errorMessage = "Unknown error in document processing";
    let errorDetails = null;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object") {
      errorMessage = JSON.stringify(error);
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage, 
        details: errorDetails,
        timestamp: new Date().toISOString() 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
