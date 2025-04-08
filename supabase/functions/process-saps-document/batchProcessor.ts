
// Batch processing for Claude AI
import { processImages } from "./imageProcessor.ts";
import { sendClaudeRequest } from "./apiClient.ts";
import { extractDataFromClaudeResponse, logBatchResults } from "./dataExtractor.ts";
import { createClaudePrompt } from "./utils.ts";

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
    // Process and validate images
    const { validImageUrls, invalidImageUrls, unsupportedFormatUrls } = processImages(images);
    
    if (validImageUrls.length === 0) {
      throw new Error(`No valid images found in the batch. All ${images.length} images were invalid or in unsupported formats.`);
    }
    
    console.log(`✅ Proceeding with ${validImageUrls.length} valid images for Claude API processing`);
    
    // Create the message content with all images in the batch
    const messageContent = [
      {
        type: "text",
        text: createClaudePrompt()
      }
    ];
    
    // Add all images to the message content
    for (const imageUrl of validImageUrls) {
      messageContent.push({
        type: "image",
        source: {
          type: "url",
          url: imageUrl
        }
      });
    }
    
    // Add some retry logic at the batch level as well
    let retryCount = 0;
    const maxBatchRetries = 2;
    
    while (retryCount <= maxBatchRetries) {
      try {
        // Send the request to Claude API
        const result = await sendClaudeRequest(messageContent, validImageUrls);
        
        // Extract the data from Claude's response
        const { extractedData, rawText } = extractDataFromClaudeResponse(result);
        
        // Log batch processing results
        await logBatchResults(
          batchId,
          userId,
          batchIndex,
          totalBatches,
          extractedData,
          rawText,
          validImageUrls
        );
        
        // Check if we found any useful data
        const hasUsefulData = extractedData && 
                            (extractedData.applicantName || extractedData.documentId || 
                            (extractedData.cultures && extractedData.cultures.length > 0));
        
        return {
          extractedData,
          rawText,
          hasUsefulData,
          batchIndex,
          totalBatches,
          imageCount: validImageUrls.length
        };
      } catch (batchError) {
        if (retryCount >= maxBatchRetries) {
          // If we've exhausted all retries, rethrow the error
          console.error(`❌ Claude processing error after ${maxBatchRetries + 1} attempts: ${batchError.message}`);
          throw batchError;
        }
        
        // Log the error and retry
        console.warn(`⚠️ Batch processing error (attempt ${retryCount + 1}/${maxBatchRetries + 1}): ${batchError.message}`);
        console.log(`🔄 Retrying batch ${batchIndex}/${totalBatches} in 5 seconds...`);
        
        // Wait for 5 seconds before retrying
        await new Promise(resolve => setTimeout(resolve, 5000));
        retryCount++;
      }
    }
    
    // This should never be reached due to the throw in the loop
    throw new Error("Unexpected error in batch processing retry loop");
  } catch (error) {
    console.error(`❌ Claude processing error: ${error.message}`);
    throw error;
  }
}
