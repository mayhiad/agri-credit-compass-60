
// Main edge function entry point for SAPS document processing
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { processDocumentWithClaude } from "./claudeProcessor.ts";
import { corsHeaders, handleCors } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    const corsResponse = handleCors(req);
    if (corsResponse) {
      return corsResponse;
    }
    
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Parse the request body
    const requestData = await req.json();
    
    // Validate required fields
    if (!requestData.batchId || !requestData.userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: batchId and userId are required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Get batch information from database
    const { data: batchData, error: batchError } = await supabase
      .from('document_batches')
      .select('*')
      .eq('batch_id', requestData.batchId)
      .eq('user_id', requestData.userId)
      .single();
    
    if (batchError || !batchData) {
      console.error("Batch retrieval error:", batchError);
      return new Response(
        JSON.stringify({ error: 'Could not find batch information', details: batchError?.message }),
        { 
          status: 404, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Get all images for this batch
    const { data: images, error: storageError } = await supabase
      .storage
      .from('dokumentumok')
      .list(`saps/${requestData.userId}/${requestData.batchId}/images`);
    
    if (storageError || !images) {
      console.error("Storage error:", storageError);
      return new Response(
        JSON.stringify({ error: 'Could not retrieve images from storage', details: storageError?.message }),
        { 
          status: 500, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
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
        JSON.stringify({ error: 'No images found for processing' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            ...corsHeaders 
          } 
        }
      );
    }
    
    // Process images with Claude AI
    const result = await processDocumentWithClaude(imageUrls, requestData.userId, requestData.batchId);
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error("Processsing error:", error);
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
