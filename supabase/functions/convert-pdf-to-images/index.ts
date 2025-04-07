
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

// Define CORS headers directly in this file
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client initialization
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PDF pages to images conversion
async function convertPdfToImages(pdfBytes: Uint8Array, userId: string, fileName: string) {
  try {
    console.log(`📄 Starting PDF conversion: ${fileName}, size: ${pdfBytes.length} bytes`);
    
    // Load PDF document
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 PDF page count: ${pageCount}`);
    
    if (pageCount === 0) {
      throw new Error("The PDF document contains no pages");
    }
    
    // Generate batch ID
    const batchId = uuidv4();
    console.log(`🆔 Batch ID: ${batchId}`);

    // Save batch information to database
    try {
      const { data: batchData, error: batchError } = await supabase
        .from('document_batches')
        .insert({
          batch_id: batchId,
          user_id: userId,
          document_name: fileName,
          page_count: pageCount,
          status: 'processing',
          original_storage_path: `saps/${userId}/${batchId}/original.pdf`,
          metadata: {
            fileSize: pdfBytes.length,
            fileName: fileName,
            mimeType: 'application/pdf'
          }
        })
        .select()
        .single();
        
      if (batchError) {
        console.error("Error saving batch information:", batchError);
        console.error("Error details:", JSON.stringify(batchError, null, 2));
      } else {
        console.log(`💾 Batch information saved to database: ${batchData?.id || 'unknown'}`);
      }
    } catch (dbError) {
      console.error("Error during database operation for document_batches:", dbError);
      // Continue with original PDF save even if database operation fails
    }
    
    // Save original PDF to storage
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('dokumentumok')
        .upload(`saps/${userId}/${batchId}/original.pdf`, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true
        });
        
      if (uploadError) {
        console.error("Error saving original PDF:", uploadError);
        throw new Error(`Failed to save original PDF: ${uploadError.message}`);
      }
      
      console.log(`💾 Original PDF saved to storage: ${uploadData?.path || 'unknown'}`);
    } catch (storageError) {
      console.error("Error during storage operation:", storageError);
      // Continue processing even if storage save fails
    }
    
    // Create images folder
    const imagesFolder = `saps/${userId}/${batchId}/images`;
    
    // Process and save pages as images
    console.log(`🖼️ Starting page to image conversion...`);
    
    // Process pages
    for (let i = 0; i < pageCount; i++) {
      try {
        // Create new PDF document with single page
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
        singlePagePdf.addPage(copiedPage);
        
        // Save PDF page
        const pdfBytes = await singlePagePdf.save();
        
        // Save page to storage
        const pageFileName = `${i + 1}_page.pdf`;
        const { data: pageData, error: pageError } = await supabase.storage
          .from('dokumentumok')
          .upload(`${imagesFolder}/${pageFileName}`, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (pageError) {
          console.error(`Error saving page ${i + 1}:`, pageError);
          continue;
        }
        
        console.log(`✅ Page ${i + 1} saved: ${pageData?.path || 'unknown'}`);
      } catch (error) {
        console.error(`Error processing page ${i + 1}:`, error);
      }
    }
    
    // Update batch status
    try {
      const { error: updateError } = await supabase
        .from('document_batches')
        .update({ status: 'converted' })
        .eq('batch_id', batchId);
        
      if (updateError) {
        console.error("Error updating batch status:", updateError);
        console.error("Error details:", JSON.stringify(updateError, null, 2));
      } else {
        console.log(`✅ Batch status updated to 'converted'`);
      }
    } catch (updateError) {
      console.error("Error during status update:", updateError);
      // Continue even if status update fails
    }
    
    console.log(`✅ PDF conversion completed: ${pageCount} pages processed`);
    
    return {
      batchId,
      pageCount,
      status: 'converted'
    };
  } catch (error) {
    console.error("Error during PDF conversion:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📥 Request received: Convert PDF to images");
    
    // Check if request contains a file
    if (req.method !== 'POST') {
      throw new Error("Only POST requests are supported");
    }
    
    // Extract request data
    const formData = await req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');
    
    if (!file || !(file instanceof File)) {
      throw new Error("No file in request");
    }
    
    if (!userId || typeof userId !== 'string') {
      throw new Error("Missing user ID");
    }
    
    console.log(`📄 Filename: ${file.name}, size: ${file.size} bytes`);
    console.log(`👤 User: ${userId}`);
    
    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    // Convert PDF to images
    const result = await convertPdfToImages(fileBytes, userId, file.name);
    
    // Send response
    return new Response(JSON.stringify({
      success: true,
      message: "PDF successfully converted to images",
      batchId: result.batchId,
      pageCount: result.pageCount,
      status: result.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error during PDF conversion:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message || "Unknown error during PDF conversion" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
