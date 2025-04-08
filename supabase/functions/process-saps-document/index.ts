
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";
import { supabase } from "./supabaseClient.ts";
import { processAllImageBatches } from "./claudeProcessor.ts";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";

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
    
    // Retrieve user info to get user sequence number
    let userSequenceNumber = 1;
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, customer_id')
        .eq('id', userId)
        .single();
        
      if (!profileError && profileData && profileData.customer_id) {
        // Extract sequence number from customer ID format "CUST-YYYY-XXXXX"
        const match = profileData.customer_id.match(/CUST-\d{4}-(\d+)/);
        if (match && match[1]) {
          userSequenceNumber = parseInt(match[1]);
        }
      }
    } catch (error) {
      console.warn("Unable to get user sequence number, using default 1");
    }
    
    // Generate a processing ID with timestamp and user sequence number
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").substring(0, 14); // YYYYMMDDHHmmss
    const processingId = `SAPS-${timestamp}-${userSequenceNumber.toString().padStart(5, '0')}`;
    console.log(`🔑 Generated processing ID: ${processingId}`);
    
    // Check if the batch exists
    let batchData;
    try {
      const { data, error: batchError } = await supabase
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
      
      if (!data) {
        throw new Error(`Batch not found with ID ${batchId}`);
      }
      
      batchData = data;
      console.log(`📊 Batch information: ${batchData.page_count} pages, status: ${batchData.status}`);
      
      // Update the processing ID for this batch
      await supabase
        .from('document_batches')
        .update({ 
          processing_id: processingId,
          status: 'processing'
        })
        .eq('batch_id', batchId);
        
      // Store the original PDF in the dokumentumok bucket
      try {
        console.log("📁 Checking for original PDF file in 'saps' path");
        
        const { data: originalFiles } = await supabase.storage
          .from('dokumentumok')
          .list(`saps/${userId}/${batchId}`);
          
        if (originalFiles && originalFiles.length > 0) {
          const pdfFiles = originalFiles.filter(file => 
            file.name.toLowerCase().endsWith('.pdf')
          );
          
          if (pdfFiles.length > 0) {
            // Get the original PDF file
            const pdfFile = pdfFiles[0];
            console.log(`📄 Found original PDF: ${pdfFile.name}`);
            
            // Download the PDF file
            const { data: pdfData, error: pdfDownloadError } = await supabase.storage
              .from('dokumentumok')
              .download(`saps/${userId}/${batchId}/${pdfFile.name}`);
              
            if (pdfDownloadError) {
              console.error("Error downloading original PDF:", pdfDownloadError);
            } else if (pdfData) {
              // Create the dokumentumok bucket if it doesn't exist
              try {
                const { data: buckets } = await supabase.storage.listBuckets();
                const dokumentumokBucketExists = buckets.some(bucket => bucket.name === 'dokumentumok');
                
                if (!dokumentumokBucketExists) {
                  await supabase.storage.createBucket('dokumentumok', {
                    public: false
                  });
                  console.log(`✅ Created dokumentumok bucket`);
                }
              } catch (bucketError) {
                console.warn(`⚠️ Error checking/creating dokumentumok bucket: ${bucketError.message}`);
              }
              
              // Upload to 'dokumentumok' bucket with processingId
              const { error: pdfUploadError } = await supabase.storage
                .from('dokumentumok')
                .upload(`${processingId}.pdf`, pdfData, {
                  contentType: 'application/pdf',
                  upsert: true
                });
                
              if (pdfUploadError) {
                console.error("Error uploading PDF to dokumentumok bucket:", pdfUploadError);
              } else {
                console.log(`✅ Copied original PDF to dokumentumok bucket as ${processingId}.pdf`);
              }
            }
          } else {
            console.warn(`⚠️ No PDF files found in saps/${userId}/${batchId}`);
          }
        } else {
          console.warn(`⚠️ No files found in saps/${userId}/${batchId}`);
        }
      } catch (storageError) {
        console.error("Error handling original PDF:", storageError);
      }
      
    } catch (error) {
      console.error(`Error checking/updating batch:`, error);
      throw new Error(`Failed to process batch: ${error.message}`);
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
    
    console.log(`📁 ${files.length} total files found in storage`);
    
    // Filter only JPG files (ensure we only use supported formats)
    const jpgFiles = files.filter(file => {
      const isJpg = file.name.toLowerCase().endsWith('.jpg') || file.name.toLowerCase().endsWith('.jpeg');
      if (!isJpg) {
        console.log(`⚠️ Skipping non-JPG file: ${file.name}`);
      }
      return isJpg;
    });
    
    console.log(`🖼️ ${jpgFiles.length} JPG images found (out of ${files.length} total files)`);
    
    if (jpgFiles.length === 0) {
      throw new Error('No JPG images found for this batch. Please ensure PDF was converted to JPGs correctly.');
    }
    
    // Sort files by page number
    const sortedFiles = jpgFiles.sort((a, b) => {
      const aNum = parseInt(a.name.split('_')[0]) || 0;
      const bNum = parseInt(b.name.split('_')[0]) || 0;
      return aNum - bNum;
    });
    
    // Copy JPG files to the jpg bucket for admin inspection
    console.log(`📋 Copying JPG files to jpg bucket for admin inspection`);
    
    // Ensure jpg bucket exists
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      const jpgBucketExists = buckets.some(bucket => bucket.name === 'jpg');
      
      if (!jpgBucketExists) {
        await supabase.storage.createBucket('jpg', {
          public: false
        });
        console.log(`✅ Created jpg bucket`);
      }
      
      const claudeResponseBucketExists = buckets.some(bucket => bucket.name === 'clauderesponse');
      if (!claudeResponseBucketExists) {
        await supabase.storage.createBucket('clauderesponse', {
          public: false
        });
        console.log(`✅ Created clauderesponse bucket`);
      }
    } catch (error) {
      console.warn(`⚠️ Error checking/creating buckets: ${error.message}`);
      // Continue with processing even if bucket creation fails
    }
    
    // Copy each file to the jpg bucket with the processingId folder
    for (const file of sortedFiles) {
      try {
        const sourceUrl = `saps/${userId}/${batchId}/images/${file.name}`;
        const destinationUrl = `${processingId}/${file.name}`;
        
        // Download file from dokumentumok bucket
        const { data, error } = await supabase.storage
          .from('dokumentumok')
          .download(sourceUrl);
          
        if (error) {
          console.warn(`⚠️ Error downloading JPG for copy: ${file.name}`, error);
          continue;
        }
        
        // Upload to jpg bucket
        if (data) {
          const { error: uploadError } = await supabase.storage
            .from('jpg')
            .upload(destinationUrl, data, {
              contentType: 'image/jpeg',
              upsert: true
            });
            
          if (uploadError) {
            console.warn(`⚠️ Error copying JPG to jpg bucket: ${file.name}`, uploadError);
          } else {
            console.log(`✅ Copied ${file.name} to jpg bucket under ${processingId}`);
          }
        }
      } catch (copyError) {
        console.warn(`⚠️ Error in file copy process: ${copyError.message}`);
        // Continue with next file
      }
    }
    
    // Generate public URLs for the images
    const imageUrls = sortedFiles.map(file => {
      const publicUrl = supabase.storage
        .from('dokumentumok')
        .getPublicUrl(`saps/${userId}/${batchId}/images/${file.name}`).data.publicUrl;
      
      return publicUrl;
    });
    
    // Log the first few URLs for debugging
    console.log(`🌐 Generated image URLs (first few examples):`);
    imageUrls.slice(0, 3).forEach((url, idx) => {
      console.log(`   ${idx + 1}: ${url}`);
    });
    
    console.log(`🌐 ${imageUrls.length} JPG image URLs generated for Claude AI processing`);
    
    // Process all images with Claude AI
    let result;
    try {
      result = await processAllImageBatches(imageUrls, userId, batchId, processingId);
    } catch (aiError) {
      console.error("❌ Claude AI processing error:", aiError);
      
      // Return a partial response with error information
      return new Response(JSON.stringify({
        error: `AI processing failed: ${aiError.message}`,
        status: 'failed',
        processingId: processingId,
        data: {
          applicantName: "N/A",
          submitterId: "N/A",
          applicantId: "N/A",
          region: "N/A",
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
    
    // Save the final Claude response to clauderesponse bucket as a text file
    if (result.rawText) {
      try {
        // Since we can't use docx directly in Deno, we'll save as plain text file
        const textContent = `CLAUDE RESPONSE FOR ${processingId}\n\n${result.rawText}`;
        const textEncoder = new TextEncoder();
        const fileContent = textEncoder.encode(textContent);
        
        const { data: textUpload, error: textError } = await supabase.storage
          .from('clauderesponse')
          .upload(`${processingId}.txt`, fileContent, {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (textError) {
          console.warn(`⚠️ Error saving Claude response to storage: ${textError.message}`);
        } else {
          const textUrl = supabase.storage
            .from('clauderesponse')
            .getPublicUrl(`${processingId}.txt`).data.publicUrl;
            
          console.log(`✅ Claude response saved to storage: ${textUrl}`);
          result.claudeResponseUrl = textUrl;
        }
      } catch (textError) {
        console.warn(`⚠️ Error creating Claude response text file: ${textError.message}`);
      }
    }
    
    // Save OCR result to the database
    let ocrLogId = null;
    try {
      const { data: ocrLog, error: ocrError } = await supabase
        .from('document_ocr_logs')
        .insert({
          user_id: userId,
          file_name: batchData.document_name || `${processingId}.pdf`,
          file_size: batchData.metadata?.fileSize || 0,
          file_type: 'application/pdf',
          storage_path: `saps/${userId}/${batchId}/images`,
          ocr_content: result.rawText || "No OCR text available",
          processing_id: processingId,
          claude_response_url: result.claudeResponseUrl
        })
        .select('id')
        .single();
        
      if (ocrError) {
        console.warn(`⚠️ OCR log save error: ${ocrError.message}`);
        console.warn(`Error details:`, JSON.stringify(ocrError, null, 2));
      } else {
        console.log(`✅ OCR log successfully created: ${ocrLog.id}`);
        ocrLogId = ocrLog.id;
      
        // Save AI processing result
        const { error: extractionError } = await supabase
          .from('document_extraction_results')
          .insert({
            ocr_log_id: ocrLog.id,
            user_id: userId,
            extracted_data: result.data || { status: 'processing' },
            processing_status: result.data ? 'completed' : 'in_progress',
            processing_time: 0,
            raw_claude_response: result.rawText || null,
            processing_id: processingId
          });
            
        if (extractionError) {
          console.warn(`⚠️ Extraction result save error: ${extractionError.message}`);
          console.warn(`Error details:`, JSON.stringify(extractionError, null, 2));
        } else {
          console.log(`✅ Extraction result saved successfully`);
        }
      }
    } catch (dbError) {
      console.error(`Database operation error:`, dbError);
      // Continue without throwing error
    }
    
    // Return result
    return new Response(JSON.stringify({
      ocrLogId: ocrLogId, 
      processingId: processingId,
      data: result.data,
      status: 'completed',
      batchInfo: result.batchInfo,
      claudeResponseUrl: result.claudeResponseUrl
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
