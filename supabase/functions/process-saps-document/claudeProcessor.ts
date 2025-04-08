// Claude API processor for document extraction
import { encode as base64Encode } from "https://deno.land/std@0.82.0/encoding/base64.ts";
import { supabase } from "./supabaseClient.ts";

// Claude API constants
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-opus-20240229";
const MAX_IMAGES_PER_REQUEST = 20; // Claude API limit

// Supported image formats by Claude API
const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Checks if an image URL has a supported file format
 */
function isImageFormatSupported(imageUrl: string): boolean {
  // Check if URL ends with a supported format
  return SUPPORTED_IMAGE_FORMATS.some(format => 
    imageUrl.toLowerCase().endsWith(format)
  );
}

/**
 * Processes a batch of images with Claude API
 */
export async function processImageBatchWithClaude(
  images: string[], 
  userId: string,
  batchId: string,
  batchIndex: number,
  totalBatches: number,
  processingId: string
) {
  console.log(`🧠 Starting Claude AI processing for batch ${batchIndex}/${totalBatches}: ${images.length} images`);
  
  try {
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!claudeApiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable not set");
    }
    
    // Verify we don't exceed the maximum images per request
    if (images.length > MAX_IMAGES_PER_REQUEST) {
      throw new Error(`Too many images in one request: ${images.length}. Maximum: ${MAX_IMAGES_PER_REQUEST}`);
    }
    
    // Build the message content with all images in the batch
    const messageContent = [
      {
        type: "text",
        text: `Ez egy mezőgazdasági területalapú támogatási (SAPS) dokumentum. Kérlek, add vissza a következő információkat JSON formátumban, pontosan a megadott struktúrával:

{
  "applicantName": "A kérelmező neve",
  "submitterId": "A kérelmező ügyfél-azonosítója",
  "applicantId": "A kérelmező ügyfél-azonosítója (lehet azonos a submitterId-val)",
  "documentId": "A dokumentum azonosítója",
  "region": "Régió neve",
  "blockIds": ["Blokkazonosító1", "Blokkazonosító2"],
  "hectares": 123.45,
  "cultures": [
    {
      "name": "Növénykultúra neve",
      "hectares": 45.67
    }
  ]
}

FONTOS SZABÁLYOK:
1. CSAK a megtalált információkat add meg, ne találj ki adatokat!
2. Ha nem találsz meg valamit, az értéket hagyd "N/A"-ként!
3. A JSON struktúrának pontosan meg kell egyeznie a fenti mintával!
4. A blokkazonosítók általában "BLOKK:" előtaggal vagy speciális formátummal szerepelnek (pl. ABC-12345)
5. Az adatokat pontosan úgy add meg, ahogy a dokumentumban szerepelnek!
6. SZIGORÚAN TILOS KITALÁLT ADATOKAT GENERÁLNI! Ha nincs elég adat, használj "N/A" értéket!

Kizárólag a JSON választ add vissza, magyarázat vagy egyéb szöveg nélkül!`
      }
    ];
    
    // Collect valid images
    const validImageUrls = [];
    const invalidImageUrls = [];
    const unsupportedFormatUrls = [];
    
    // Add all images to the message content
    for (let i = 0; i < images.length; i++) {
      try {
        const imageUrl = images[i];
        
        // Check if URL is properly formatted
        if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
          console.warn(`⚠️ Skipping invalid URL format at index ${i}: ${imageUrl}`);
          invalidImageUrls.push(imageUrl);
          continue;
        }
        
        // Check if URL is publicly accessible from Supabase
        if (!imageUrl.includes('supabase.co')) {
          console.warn(`⚠️ Image URL is not from Supabase, skipping: ${imageUrl}`);
          invalidImageUrls.push(imageUrl);
          continue;
        }
        
        // Check if image format is supported by Claude API
        if (!isImageFormatSupported(imageUrl)) {
          console.warn(`⚠️ Image format not supported by Claude API, skipping: ${imageUrl}`);
          unsupportedFormatUrls.push(imageUrl);
          continue;
        }
        
        // Log file extension for debugging
        const fileExtension = imageUrl.split('.').pop() || '';
        console.log(`📸 Image URL ${i + 1}: ${imageUrl.substring(0, 100)}... (format: ${fileExtension.toLowerCase()})`);
        
        // Use the URL format that Claude accepts
        messageContent.push({
          type: "image",
          source: {
            type: "url",
            url: imageUrl
          }
        });
        
        validImageUrls.push(imageUrl);
      } catch (imageError) {
        console.error(`❌ Error processing image at index ${i}:`, imageError);
        invalidImageUrls.push(images[i]);
      }
    }
    
    // Log summary of image processing
    console.log(`🔍 Summary of image processing:`);
    console.log(`- Valid images: ${validImageUrls.length}`);
    console.log(`- Invalid URLs: ${invalidImageUrls.length}`);
    console.log(`- Unsupported formats: ${unsupportedFormatUrls.length}`);
    
    if (validImageUrls.length === 0) {
      throw new Error(`No valid images found in the batch. All ${images.length} images were invalid or in unsupported formats.`);
    }
    
    console.log(`✅ Proceeding with ${validImageUrls.length} valid images for Claude API processing`);
    
    // Construct Claude API request
    const payload = {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0,
      system: "Te egy mezőgazdasági dokumentumok elemzésére specializált asszisztens vagy. Olvasd el alaposan a SAPS dokumentumokat, és pontosan nyerd ki a kért információkat! Ha egy mezőt nem találsz, az értéket hagyd 'N/A'-ként. A JSON válasznak pontosan követnie kell a megadott struktúrát. SZIGORÚAN TILOS KITALÁNI ADATOKAT! Pontosan azt add vissza, amit a dokumentumban látsz.",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ]
    };
    
    console.log(`🚀 Sending Claude API request: ${CLAUDE_API_URL}, model: ${CLAUDE_MODEL}, with ${validImageUrls.length} images`);
    
    // Log a sample of the request for debugging
    console.log(`Request summary: model=${payload.model}, images=${validImageUrls.length}, prompt size=${payload.messages[0].content[0].text.length} chars`);
    
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Claude API error: ${response.status} - ${errorText}`);
      
      // Try to extract more meaningful error information
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error?.message || errorJson.error || errorText;
        throw new Error(`Claude API error: ${response.status} - ${errorMessage}`);
      } catch (parseError) {
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }
    }
    
    const result = await response.json();
    console.log(`✅ Claude API response received. Content type: ${result.content?.[0]?.type}, length: ${result.content?.[0]?.text?.length || 0} chars`);
    
    // Save the raw Claude response to clauderesponse bucket
    let claudeResponseUrl = null;
    if (result.content && result.content.length > 0) {
      const rawText = result.content[0].text;
      
      try {
        const textEncoder = new TextEncoder();
        const fileContent = textEncoder.encode(rawText);
        
        const { data: responseUpload, error: responseError } = await supabase.storage
          .from('clauderesponse')
          .upload(`${processingId}_batch${batchIndex}.txt`, fileContent, {
            contentType: 'text/plain',
            upsert: true
          });
          
        if (responseError) {
          console.warn(`⚠️ Error saving Claude batch response to storage: ${responseError.message}`);
        } else {
          claudeResponseUrl = supabase.storage
            .from('clauderesponse')
            .getPublicUrl(`${processingId}_batch${batchIndex}.txt`).data.publicUrl;
            
          console.log(`✅ Claude batch response saved to storage: ${claudeResponseUrl}`);
        }
      } catch (saveError) {
        console.warn(`⚠️ Error creating Claude batch response document: ${saveError.message}`);
      }
    }
    
    // Extract the JSON response from Claude's text output
    let extractedData = {
      applicantName: "N/A",
      submitterId: "N/A",
      applicantId: "N/A",
      documentId: "N/A",
      region: "N/A",
      blockIds: [],
      hectares: 0,
      cultures: []
    };
    let rawText = "";
    let hasUsefulData = false;
    
    if (result.content && result.content.length > 0) {
      // The response should be a JSON string
      rawText = result.content[0].text;
      
      try {
        // Try to extract JSON from the text response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsedData = JSON.parse(jsonMatch[0]);
          console.log(`✅ Data extracted: ${JSON.stringify(parsedData, null, 2)}`);
          
          // Check if we have any useful data (applicantName, submitterId, or applicantId)
          if (parsedData.applicantName && parsedData.applicantName !== "N/A") {
            extractedData.applicantName = parsedData.applicantName;
            hasUsefulData = true;
          }
          
          if (parsedData.submitterId && parsedData.submitterId !== "N/A") {
            extractedData.submitterId = parsedData.submitterId;
            hasUsefulData = true;
          }
          
          if (parsedData.applicantId && parsedData.applicantId !== "N/A") {
            extractedData.applicantId = parsedData.applicantId;
            hasUsefulData = true;
          }
          
          if (parsedData.documentId && parsedData.documentId !== "N/A") {
            extractedData.documentId = parsedData.documentId;
            hasUsefulData = true;
          }
          
          if (parsedData.region && parsedData.region !== "N/A") {
            extractedData.region = parsedData.region;
          }
          
          if (Array.isArray(parsedData.blockIds) && parsedData.blockIds.length > 0) {
            extractedData.blockIds = parsedData.blockIds;
          }
          
          if (typeof parsedData.hectares === 'number' && parsedData.hectares > 0) {
            extractedData.hectares = parsedData.hectares;
          }
          
          if (Array.isArray(parsedData.cultures) && parsedData.cultures.length > 0) {
            extractedData.cultures = parsedData.cultures;
          }
        } else {
          console.warn(`⚠️ Could not extract JSON data from the response`);
        }
      } catch (parseError) {
        console.error(`❌ JSON parsing error: ${parseError.message}`);
      }
    }
    
    // Log batch processing results
    try {
      const { data, error } = await supabase
        .from('document_batch_results')
        .insert({
          batch_id: batchId,
          user_id: userId,
          batch_index: batchIndex,
          total_batches: totalBatches,
          extracted_data: extractedData,
          raw_response: rawText,
          image_count: validImageUrls.length,
          images_processed: validImageUrls,
          processing_id: processingId,
          claude_response_url: claudeResponseUrl
        })
        .select('id')
        .single();
        
      if (error) {
        console.error(`❌ Error saving batch results:`, error);
        console.error(`Error details:`, JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ Batch results saved: ${data.id}`);
      }
    } catch (dbError) {
      console.error(`❌ Database error while saving batch results:`, dbError);
      // Continue processing despite database error
    }
    
    return {
      extractedData,
      rawText,
      hasUsefulData,
      batchIndex,
      totalBatches,
      imageCount: validImageUrls.length,
      claudeResponseUrl
    };
    
  } catch (error) {
    console.error(`❌ Claude processing error: ${error.message}`);
    throw error;
  }
}

/**
 * Process all batches of images sequentially until we get useful data
 */
export async function processAllImageBatches(
  imageUrls: string[],
  userId: string,
  batchId: string,
  processingId: string
) {
  console.log(`🔄 Starting all image batch processing: ${imageUrls.length} images`);
  
  // Filter out any obviously invalid URLs before batching
  const filteredUrls = imageUrls.filter(url => {
    const isValid = url && typeof url === 'string' && url.includes('supabase.co') && url.startsWith('http');
    if (!isValid) {
      console.warn(`⚠️ Filtering out invalid URL: ${url}`);
    }
    return isValid;
  });
  
  // Further filter for supported image formats
  const supportedUrls = filteredUrls.filter(url => {
    const isSupported = isImageFormatSupported(url);
    if (!isSupported) {
      console.warn(`⚠️ Filtering out unsupported image format: ${url}`);
    }
    return isSupported;
  });
  
  console.log(`✅ After filtering: ${supportedUrls.length} valid and supported images out of ${imageUrls.length} total`);
  console.log(`📄 First few image URLs for verification:`);
  supportedUrls.slice(0, 3).forEach((url, i) => {
    console.log(`   ${i+1}: ${url}`);
  });
  
  if (supportedUrls.length === 0) {
    throw new Error("No valid and supported image URLs found to process");
  }
  
  // Split images into batches of MAX_IMAGES_PER_REQUEST
  const batches = [];
  for (let i = 0; i < supportedUrls.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(supportedUrls.slice(i, i + MAX_IMAGES_PER_REQUEST));
  }
  
  console.log(`📦 Number of batches: ${batches.length}`);
  
  let allExtractedData = {
    applicantName: "N/A",
    submitterId: "N/A",
    applicantId: "N/A",
    documentId: "N/A",
    region: "N/A",
    blockIds: [],
    hectares: 0,
    cultures: []
  };
  let allRawText = "";
  let foundUsefulData = false;
  let processedBatches = 0;
  let failedBatches = 0;
  let lastError = null;
  let finalClaudeResponseUrl = null;
  
  // Process each batch sequentially until we find useful data
  for (let i = 0; i < batches.length; i++) {
    console.log(`⏳ Processing batch ${i+1}/${batches.length}...`);
    
    try {
      const result = await processImageBatchWithClaude(
        batches[i],
        userId,
        batchId,
        i + 1,
        batches.length,
        processingId
      );
      
      processedBatches++;
      allRawText += `\n\n--- BATCH ${i+1} ---\n\n${result.rawText}`;
      
      // Save the Claude response URL from the first batch (or any batch that has a URL)
      if (!finalClaudeResponseUrl && result.claudeResponseUrl) {
        finalClaudeResponseUrl = result.claudeResponseUrl;
      }
      
      // If the data is useful (contains at least one of: applicantName, submitterId, applicantId)
      if (result.hasUsefulData) {
        console.log(`✅ Found useful data in batch ${i+1}, stopping processing`);
        
        // Update the combined data with this batch's data
        allExtractedData = {
          ...allExtractedData,
          ...result.extractedData
        };
        
        foundUsefulData = true;
        break;
      } else {
        // If no useful data yet, keep accumulating data
        if (result.extractedData.region !== "N/A") allExtractedData.region = result.extractedData.region;
        if (result.extractedData.blockIds.length > 0) allExtractedData.blockIds = [...allExtractedData.blockIds, ...result.extractedData.blockIds];
        if (result.extractedData.hectares > 0) allExtractedData.hectares = result.extractedData.hectares;
        if (result.extractedData.cultures.length > 0) allExtractedData.cultures = [...allExtractedData.cultures, ...result.extractedData.cultures];
      }
    } catch (batchError) {
      console.error(`❌ Error processing batch ${i+1}:`, batchError);
      failedBatches++;
      allRawText += `\n\n--- BATCH ${i+1} ERROR ---\n\n${batchError.message}`;
      // Continue with next batch instead of failing completely
      continue;
    }
  }
  
  // If all batches failed, throw the last error
  if (processedBatches === 0 && failedBatches > 0 && lastError) {
    throw new Error(`All batches failed to process. Last error: ${lastError.message}`);
  }
  
  // Create a combined Claude response document with all batch responses
  if (allRawText) {
    try {
      const textEncoder = new TextEncoder();
      const completeContent = `COMBINED CLAUDE RESPONSES FOR ${processingId}\n\n${allRawText}`;
      const fileContent = textEncoder.encode(completeContent);
      
      const { data: completeUpload, error: completeError } = await supabase.storage
        .from('clauderesponse')
        .upload(`${processingId}_complete.txt`, fileContent, {
          contentType: 'text/plain',
          upsert: true
        });
        
      if (completeError) {
        console.warn(`⚠️ Error saving complete Claude response to storage: ${completeError.message}`);
      } else {
        finalClaudeResponseUrl = supabase.storage
          .from('clauderesponse')
          .getPublicUrl(`${processingId}_complete.txt`).data.publicUrl;
          
        console.log(`✅ Complete Claude response saved to storage: ${finalClaudeResponseUrl}`);
      }
    } catch (completeError) {
      console.warn(`⚠️ Error creating complete Claude response document: ${completeError.message}`);
    }
  }
  
  // Update the batch status in the database
  try {
    const { error } = await supabase
      .from('document_batches')
      .update({
        status: foundUsefulData ? 'completed' : 'failed',
        metadata: {
          foundUsefulData,
          processedAt: new Date().toISOString(),
          extractedData: allExtractedData,
          processedBatches,
          failedBatches,
          processingId
        }
      })
      .eq('batch_id', batchId);
      
    if (error) {
      console.error(`❌ Error updating batch status:`, error);
      console.error(`Error details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Batch status updated to ${foundUsefulData ? 'completed' : 'failed'}`);
    }
  } catch (updateError) {
    console.error(`❌ Database error while updating batch status:`, updateError);
    // Continue processing despite database error
  }
  
  // Create farm data structure from the extracted data
  const farmData = {
    applicantName: allExtractedData.applicantName,
    submitterId: allExtractedData.submitterId,
    applicantId: allExtractedData.applicantId,
    documentId: allExtractedData.documentId,
    region: allExtractedData.region,
    year: new Date().getFullYear().toString(),
    hectares: allExtractedData.hectares,
    cultures: allExtractedData.cultures,
    blockIds: allExtractedData.blockIds,
    rawText: allRawText
  };
  
  return {
    data: farmData,
    rawText: allRawText,
    success: foundUsefulData,
    claudeResponseUrl: finalClaudeResponseUrl,
    batchInfo: {
      totalBatches: batches.length,
      processedBatches: processedBatches,
      failedBatches: failedBatches,
      totalPages: supportedUrls.length,
      processedPages: processedBatches * MAX_IMAGES_PER_REQUEST
    }
  };
}
