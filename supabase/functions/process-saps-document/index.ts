
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";
import { supabase } from "./openaiClient.ts";
import { processAllImageBatches } from "./claudeProcessor.ts";

serve(async (req) => {
  // Add initial log message
  console.log("📥 Supabase function called!");

  // Handle CORS
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log("📥 Request received: URL:", req.url, "Method:", req.method);
    console.log("📤 Request headers:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    const requestData = await req.json();
    const { batchId, userId } = requestData;
    
    if (!batchId) throw new Error('Missing batch ID');
    if (!userId) throw new Error('Missing user ID');

    console.log(`🔍 Processing SAPS document: Batch ID: ${batchId}, User: ${userId}`);
    
    // Check if the batch exists
    try {
      const { data: batchData, error: batchError } = await supabase
        .from('document_batches')
        .select('*')
        .eq('batch_id', batchId)
        .eq('user_id', userId)
        .single();
        
      if (batchError) {
        console.error(`Error fetching batch data:`, batchError);
        console.error(`Error details:`, JSON.stringify(batchError, null, 2));
        throw new Error(`Batch not found: ${batchError.message || 'Unknown error'}`);
      }
      
      if (!batchData) {
        throw new Error(`Batch not found with ID ${batchId}`);
      }
      
      console.log(`📊 Batch information: ${batchData.page_count} pages, status: ${batchData.status}`);
      
      // If the batch has already been processed, return the existing result
      if (batchData.status === 'completed' && batchData.metadata?.extractedData) {
        console.log(`🔄 Batch already processed, returning existing result`);
        
        return new Response(JSON.stringify({
          data: {
            applicantName: batchData.metadata.extractedData.submitterName || null,
            documentId: batchData.metadata.extractedData.submitterId || null,
            submitterId: batchData.metadata.extractedData.submitterId || null,
            applicantId: batchData.metadata.extractedData.applicantId || null,
            region: null,
            year: new Date().getFullYear().toString(),
            hectares: 0,
            cultures: [],
            blockIds: [],
            totalRevenue: 0
          },
          status: 'completed',
          batchInfo: {
            totalBatches: Math.ceil(batchData.page_count / 20),
            processedBatches: Math.ceil(batchData.page_count / 20),
            totalPages: batchData.page_count,
            processedPages: batchData.page_count
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } catch (error) {
      console.error(`Error checking batch:`, error);
      // Continue processing without throwing an error - we'll create it if missing
    }
    
    // Retrieve images for the batch from storage
    console.log(`🖼️ Retrieving images for batch: ${batchId}`);
    
    const { data: files, error: filesError } = await supabase.storage
      .from('dokumentumok')
      .list(`saps/${userId}/${batchId}/images`);
      
    if (filesError) {
      console.error(`Error retrieving images:`, filesError);
      throw new Error(`Failed to retrieve images: ${filesError.message || 'Unknown error'}`);
    }
    
    if (!files || files.length === 0) {
      throw new Error('No images found for this batch');
    }
    
    console.log(`📁 ${files.length} images found in storage`);
    
    // Sort files by page number
    const sortedFiles = files.sort((a, b) => {
      const aNum = parseInt(a.name.split('_')[0]) || 0;
      const bNum = parseInt(b.name.split('_')[0]) || 0;
      return aNum - bNum;
    });
    
    // Generate public URLs for the images
    const imageUrls = sortedFiles.map(file => {
      const publicUrl = supabase.storage
        .from('dokumentumok')
        .getPublicUrl(`saps/${userId}/${batchId}/images/${file.name}`).data.publicUrl;
      
      // Log the first few URLs for debugging
      if (sortedFiles.indexOf(file) < 5) {
        console.log(`Example image URL ${sortedFiles.indexOf(file)}: ${publicUrl}`);
      }
      
      return publicUrl;
    });
    
    console.log(`🌐 ${imageUrls.length} image URLs generated`);
    
    // Process all images with Claude AI
    let result;
    try {
      result = await processAllImageBatches(imageUrls, userId, batchId);
    } catch (aiError) {
      console.error("❌ Claude AI processing error:", aiError);
      
      // Return a partial response with error information
      return new Response(JSON.stringify({
        error: `AI processing failed: ${aiError.message}`,
        status: 'failed',
        data: {
          applicantName: null,
          submitterId: null,
          applicantId: null,
          region: null,
          year: new Date().getFullYear().toString(),
          hectares: 0,
          cultures: [],
          blockIds: [],
          totalRevenue: 0,
          errorMessage: `Failed to process document: ${aiError.message}`
        },
        batchInfo: {
          totalBatches: Math.ceil(imageUrls.length / 20),
          processedBatches: 0,
          totalPages: imageUrls.length,
          processedPages: 0
        }
      }), {
        status: 200, // Still return 200 with error information in the payload
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Save OCR result to the database
    try {
      const { data: ocrLog, error: ocrError } = await supabase
        .from('document_ocr_logs')
        .insert({
          user_id: userId,
          file_name: files[0].name.split('_')[0] + '.pdf', // Approximation for original filename
          file_size: 0, // We don't have the original file size here
          file_type: 'application/pdf',
          storage_path: `saps/${userId}/${batchId}/images`,
          ocr_content: result.rawText || "No OCR text available"
        })
        .select('id')
        .single();
        
      if (ocrError) {
        console.warn(`⚠️ OCR log save error: ${ocrError.message}`);
        console.warn(`Error details:`, JSON.stringify(ocrError, null, 2));
      } else {
        console.log(`✅ OCR log successfully created: ${ocrLog.id}`);
      
        // Save AI processing result
        if (ocrLog?.id) {
          const { error: extractionError } = await supabase
            .from('document_extraction_results')
            .insert({
              ocr_log_id: ocrLog.id,
              user_id: userId,
              extracted_data: result.data || { status: 'processing' },
              processing_status: result.data ? 'completed' : 'in_progress',
              processing_time: 0
            });
            
          if (extractionError) {
            console.warn(`⚠️ Extraction result save error: ${extractionError.message}`);
            console.warn(`Error details:`, JSON.stringify(extractionError, null, 2));
          } else {
            console.log(`✅ Extraction result saved successfully`);
          }
        }
      }
    } catch (dbError) {
      console.error(`Database operation error:`, dbError);
      // Continue without throwing error
    }
    
    // Return result
    return new Response(JSON.stringify({
      ocrLogId: null, // We don't always have this value
      data: result.data,
      status: 'completed',
      batchInfo: result.batchInfo
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Final error handler:", error);
    
    // Send more detailed error response to the frontend
    let errorMessage = "Unknown error occurred";
    let errorDetails = "";
    let errorStack = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.toString();
      errorStack = error.stack || "";
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage, 
      details: errorDetails,
      stack: errorStack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
