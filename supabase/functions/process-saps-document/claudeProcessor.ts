
// Claude API processor for document extraction
import { encode as base64Encode } from "https://deno.land/std@0.82.0/encoding/base64.ts";
import { supabase } from "./openaiClient.ts";

// Claude API constants
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-opus-20240229";
const MAX_IMAGES_PER_REQUEST = 20; // Claude API limit

/**
 * Processes a batch of images with Claude API
 */
export async function processImageBatchWithClaude(
  images: string[], 
  userId: string,
  batchId: string,
  batchIndex: number,
  totalBatches: number
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
        text: "This is an agricultural area-based support document. Please find and return the following data in JSON format:\n" +
              "- submitterName: the name of the submitter, usually found on the first page\n" +
              "- submitterId: the submitter's client ID number, a 10-digit number\n" +
              "- applicantId: the applicant's client ID number, a 10-digit number (may be the same as the submitter)\n\n" +
              "Only return the following JSON format: { \"submitterName\": \"...\", \"submitterId\": \"...\", \"applicantId\": \"...\" }"
      }
    ];
    
    // Add all images to the message content
    for (const imageUrl of images) {
      // Check if URL is publicly accessible
      if (imageUrl.includes('supabase.co')) {
        messageContent.push({
          type: "image",
          source: {
            type: "url",
            url: imageUrl
          }
        });
      } else {
        throw new Error(`Image URL is not public: ${imageUrl}`);
      }
    }
    
    // Construct Claude API request
    const payload = {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0,
      system: "You are an assistant specialized in analyzing agricultural data. Read the documents accurately to extract the requested information. Don't make up data, and if you're unsure about something, leave it blank. Always return results only in the requested JSON format.",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ]
    };
    
    console.log(`🚀 Sending Claude API request: ${CLAUDE_API_URL}, model: ${CLAUDE_MODEL}, with ${images.length} images`);
    
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
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Claude API response received:`, result);
    
    // Extract the JSON response from Claude's text output
    let extractedData = {};
    let rawText = "";
    
    if (result.content && result.content.length > 0) {
      // The response should be a JSON string
      rawText = result.content[0].text;
      
      try {
        // Try to extract JSON from the text response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
          console.log(`✅ Data extracted: ${JSON.stringify(extractedData)}`);
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
          image_count: images.length,
          images_processed: images
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
    
    // Check if we found any useful data
    const hasUsefulData = extractedData && 
                         (extractedData.submitterName || extractedData.submitterId || extractedData.applicantId);
    
    return {
      extractedData,
      rawText,
      hasUsefulData,
      batchIndex,
      totalBatches,
      imageCount: images.length
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
  batchId: string
) {
  console.log(`🔄 Starting all image batch processing: ${imageUrls.length} images`);
  
  // Split images into batches of MAX_IMAGES_PER_REQUEST
  const batches = [];
  for (let i = 0; i < imageUrls.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(imageUrls.slice(i, i + MAX_IMAGES_PER_REQUEST));
  }
  
  console.log(`📦 Number of batches: ${batches.length}`);
  
  let allExtractedData = {};
  let foundUsefulData = false;
  
  // Process each batch sequentially until we find useful data
  for (let i = 0; i < batches.length; i++) {
    console.log(`⏳ Processing batch ${i+1}/${batches.length}...`);
    
    const result = await processImageBatchWithClaude(
      batches[i],
      userId,
      batchId,
      i + 1,
      batches.length
    );
    
    // Merge any extracted data
    allExtractedData = {
      ...allExtractedData,
      ...result.extractedData
    };
    
    // Check if we found useful data
    if (result.hasUsefulData) {
      console.log(`✅ Found useful data in batch ${i+1}, stopping processing`);
      foundUsefulData = true;
      break;
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
          extractedData: allExtractedData
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
    applicantName: allExtractedData.submitterName || null,
    documentId: allExtractedData.submitterId || null,
    submitterId: allExtractedData.submitterId || null,
    applicantId: allExtractedData.applicantId || null,
    region: null,
    year: new Date().getFullYear().toString(),
    hectares: 0,
    cultures: [],
    blockIds: [],
    totalRevenue: 0,
    rawText: JSON.stringify(allExtractedData)
  };
  
  return {
    data: farmData,
    rawText: JSON.stringify(allExtractedData),
    success: foundUsefulData,
    batchInfo: {
      totalBatches: batches.length,
      processedBatches: foundUsefulData ? batches.findIndex(b => b.includes(imageUrls[0])) + 1 : batches.length,
      totalPages: imageUrls.length,
      processedPages: foundUsefulData ? 
        (batches.findIndex(b => b.includes(imageUrls[0])) + 1) * MAX_IMAGES_PER_REQUEST : 
        imageUrls.length
    }
  };
}
