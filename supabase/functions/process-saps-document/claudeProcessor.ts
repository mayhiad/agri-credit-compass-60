
// Claude AI processor for document extraction
import { MAX_IMAGES_PER_REQUEST, splitIntoBatches } from "./utils.ts";
import { filterValidImages } from "./imageProcessor.ts";
import { processImageBatchWithClaude } from "./batchProcessor.ts";
import { updateBatchStatus, createFarmDataStructure } from "./dataExtractor.ts";

/**
 * Process all batches of images sequentially until we get useful data
 */
export async function processAllImageBatches(
  imageUrls: string[],
  userId: string,
  batchId: string
) {
  console.log(`🔄 Starting all image batch processing: ${imageUrls.length} images`);
  
  // Filter for valid and supported images
  const supportedUrls = filterValidImages(imageUrls);
  
  if (supportedUrls.length === 0) {
    throw new Error("No valid and supported image URLs found to process");
  }
  
  // Split images into batches of MAX_IMAGES_PER_REQUEST
  const batches = splitIntoBatches(supportedUrls, MAX_IMAGES_PER_REQUEST);
  
  console.log(`📦 Number of batches: ${batches.length}`);
  
  let allExtractedData = {};
  let foundUsefulData = false;
  let processedBatches = 0;
  let failedBatches = 0;
  let lastError = null;
  
  // Process each batch sequentially until we find useful data
  for (let i = 0; i < batches.length; i++) {
    console.log(`⏳ Processing batch ${i+1}/${batches.length}...`);
    
    try {
      const result = await processImageBatchWithClaude(
        batches[i],
        userId,
        batchId,
        i + 1,
        batches.length
      );
      
      processedBatches++;
      
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
    } catch (batchError) {
      console.error(`❌ Error processing batch ${i+1}:`, batchError);
      failedBatches++;
      lastError = batchError;
      // Continue with next batch instead of failing completely
      continue;
    }
  }
  
  // If all batches failed, throw the last error
  if (processedBatches === 0 && failedBatches > 0 && lastError) {
    throw new Error(`All batches failed to process. Last error: ${lastError.message}`);
  }
  
  // Update the batch status in the database
  await updateBatchStatus(
    batchId, 
    foundUsefulData ? 'completed' : 'failed',
    allExtractedData,
    processedBatches,
    failedBatches
  );
  
  // Create farm data structure from the extracted data
  const farmData = createFarmDataStructure(allExtractedData, foundUsefulData);
  
  return {
    data: farmData,
    rawText: JSON.stringify(allExtractedData),
    success: foundUsefulData,
    batchInfo: {
      totalBatches: batches.length,
      processedBatches: processedBatches,
      failedBatches: failedBatches,
      totalPages: supportedUrls.length,
      processedPages: foundUsefulData ? 
        Math.min(processedBatches * MAX_IMAGES_PER_REQUEST, supportedUrls.length) : 
        supportedUrls.length
    }
  };
}

/**
 * Process multiple images with Claude AI
 */
export async function processDocumentWithClaude(imageUrls: string[], userId: string, batchId: string) {
  try {
    return await processAllImageBatches(imageUrls, userId, batchId);
  } catch (error) {
    console.error("Error in Claude processing:", error);
    throw error;
  }
}
