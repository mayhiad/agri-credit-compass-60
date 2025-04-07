
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

// Define CORS headers directly in this file
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase client initialization
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ConvertAPI key
const convertApiKey = Deno.env.get('CONVERT_API_KEY') || '';

// PDF to JPG conversion using ConvertAPI
async function convertPdfToImages(pdfBytes: Uint8Array, userId: string, fileName: string) {
  try {
    console.log(`📄 Starting PDF conversion: ${fileName}, size: ${pdfBytes.length} bytes`);
    
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
          page_count: 0, // Will update after conversion
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
      
      // Create images folder
      const imagesFolder = `saps/${userId}/${batchId}/images`;
      
      // Prepare FormData for ConvertAPI with proper content type
      const formData = new FormData();
      const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' });
      formData.append('File', pdfBlob, 'document.pdf');
      
      console.log(`🖼️ Starting ConvertAPI PDF to JPG conversion...`);
      console.log(`🚀 API Key status: ${convertApiKey ? "Provided" : "MISSING!"}`);
      
      // Detailed request logging
      const apiUrl = `https://v2.convertapi.com/convert/pdf/to/jpg?Secret=${convertApiKey}&StoreFile=true&ImageResolutionH=300&ImageResolutionV=300&ImageQuality=90`;
      console.log(`🌐 Calling ConvertAPI URL: ${apiUrl.replace(convertApiKey, "API_KEY_HIDDEN")}`);
      
      // Call ConvertAPI with proper error handling
      let convertResponse;
      try {
        console.log(`📤 Sending PDF to ConvertAPI, size: ${pdfBytes.length} bytes`);
        convertResponse = await fetch(apiUrl, {
          method: 'POST',
          body: formData
        });
        
        console.log(`📥 ConvertAPI response status: ${convertResponse.status}`);
        
        if (!convertResponse.ok) {
          const errorText = await convertResponse.text();
          console.error("ConvertAPI error response:", errorText);
          
          // Try to parse and log the error details
          try {
            const errorJson = JSON.parse(errorText);
            console.error("ConvertAPI error details:", JSON.stringify(errorJson, null, 2));
            throw new Error(`ConvertAPI error: ${errorJson.Message || errorText}`);
          } catch (parseError) {
            throw new Error(`ConvertAPI error: ${errorText}`);
          }
        }
      } catch (fetchError) {
        console.error("Network error during ConvertAPI call:", fetchError);
        throw new Error(`Failed to connect to ConvertAPI: ${fetchError.message}`);
      }
      
      // Parse the response
      let convertResult;
      try {
        const responseText = await convertResponse.text();
        console.log(`📝 ConvertAPI raw response: ${responseText.substring(0, 500)}...`);
        convertResult = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Error parsing ConvertAPI response:", parseError);
        throw new Error(`Failed to parse ConvertAPI response: ${parseError.message}`);
      }
      
      console.log(`✅ ConvertAPI conversion result:`, JSON.stringify(convertResult, null, 2));
      
      // Check if we have files in the result
      if (!convertResult.Files || !Array.isArray(convertResult.Files) || convertResult.Files.length === 0) {
        throw new Error("No files returned from ConvertAPI");
      }
      
      // Process and save the converted JPG files
      const pageCount = convertResult.Files.length;
      const savedImages = [];
      
      for (let i = 0; i < convertResult.Files.length; i++) {
        const file = convertResult.Files[i];
        const fileUrl = file.Url;
        const fileName = `${i + 1}_page.jpg`;
        
        console.log(`📥 Downloading JPG file ${i + 1} from ${fileUrl}`);
        
        // Download the JPG file from ConvertAPI
        const fileResponse = await fetch(fileUrl);
        if (!fileResponse.ok) {
          console.error(`Error downloading JPG file ${i + 1}:`, await fileResponse.text());
          continue;
        }
        
        const fileBuffer = await fileResponse.arrayBuffer();
        const fileBytes = new Uint8Array(fileBuffer);
        
        console.log(`📥 Successfully downloaded JPG file ${i + 1}, size: ${fileBytes.length} bytes`);
        
        // Save JPG file to Supabase storage
        const { data: savedImage, error: saveError } = await supabase.storage
          .from('dokumentumok')
          .upload(`${imagesFolder}/${fileName}`, fileBytes, {
            contentType: 'image/jpeg',
            upsert: true
          });
          
        if (saveError) {
          console.error(`Error saving JPG file ${i + 1}:`, saveError);
          continue;
        }
        
        console.log(`✅ JPG page ${i + 1} saved: ${savedImage?.path || 'unknown'}`);
        savedImages.push(savedImage);
        
        // Get public URL for verification
        const { data: { publicUrl } } = supabase.storage
          .from('dokumentumok')
          .getPublicUrl(`${imagesFolder}/${fileName}`);
          
        console.log(`🔗 JPG page ${i + 1} public URL: ${publicUrl}`);
      }
      
      // Update batch with page count
      try {
        const { error: updateError } = await supabase
          .from('document_batches')
          .update({ 
            status: 'converted',
            page_count: pageCount
          })
          .eq('batch_id', batchId);
          
        if (updateError) {
          console.error("Error updating batch status:", updateError);
          console.error("Error details:", JSON.stringify(updateError, null, 2));
        } else {
          console.log(`✅ Batch status updated to 'converted' with ${pageCount} pages`);
        }
      } catch (updateError) {
        console.error("Error during status update:", updateError);
        // Continue even if status update fails
      }
      
      console.log(`✅ PDF conversion completed: ${pageCount} JPG images processed`);
      
      return {
        batchId,
        pageCount,
        status: 'converted'
      };
      
    } catch (storageError) {
      console.error("Error during storage operation:", storageError);
      throw storageError;
    }
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
    
    // Check if API key is configured
    if (!convertApiKey) {
      throw new Error("CONVERT_API_KEY environment variable not set");
    }
    
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
    
    console.log(`📄 Filename: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
    console.log(`👤 User: ${userId}`);
    
    // Validate file type
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      throw new Error("Only PDF files are supported");
    }
    
    // Read file content
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    // Convert PDF to images
    const result = await convertPdfToImages(fileBytes, userId, file.name);
    
    // Send response
    return new Response(JSON.stringify({
      success: true,
      message: "PDF successfully converted to JPG images",
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
