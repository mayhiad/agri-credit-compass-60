
// Data extraction helper for Claude responses
import { supabase } from "./openaiClient.ts";

/**
 * Extracts structured data from Claude API response
 */
export function extractDataFromClaudeResponse(result: any) {
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
  
  return {
    extractedData,
    rawText
  };
}

/**
 * Logs batch processing results to the database
 */
export async function logBatchResults(
  batchId: string,
  userId: string,
  batchIndex: number,
  totalBatches: number,
  extractedData: any,
  rawText: string,
  validImageUrls: string[]
) {
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
        images_processed: validImageUrls
      })
      .select('id')
      .single();
      
    if (error) {
      console.error(`❌ Error saving batch results:`, error);
      console.error(`Error details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Batch results saved: ${data.id}`);
    }
    
    return data?.id;
  } catch (dbError) {
    console.error(`❌ Database error while saving batch results:`, dbError);
    // Continue processing despite database error
    return null;
  }
}

/**
 * Update batch status in the database
 */
export async function updateBatchStatus(
  batchId: string,
  status: 'completed' | 'failed',
  allExtractedData: any,
  processedBatches: number,
  failedBatches: number
) {
  try {
    const { error } = await supabase
      .from('document_batches')
      .update({
        status: status,
        metadata: {
          foundUsefulData: status === 'completed',
          processedAt: new Date().toISOString(),
          extractedData: allExtractedData,
          processedBatches,
          failedBatches
        }
      })
      .eq('batch_id', batchId);
      
    if (error) {
      console.error(`❌ Error updating batch status:`, error);
      console.error(`Error details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Batch status updated to ${status}`);
    }
    
    return !error;
  } catch (updateError) {
    console.error(`❌ Database error while updating batch status:`, updateError);
    // Continue processing despite database error
    return false;
  }
}

/**
 * Create farm data structure from the extracted data
 */
export function createFarmDataStructure(allExtractedData: any, foundUsefulData: boolean) {
  return {
    applicantName: allExtractedData.applicantName || null,
    submitterId: allExtractedData.submitterId || null,
    applicantId: allExtractedData.applicantId || null,
    documentId: allExtractedData.documentId || null,
    submissionDate: allExtractedData.submissionDate || null,
    region: allExtractedData.region || null,
    year: allExtractedData.year || new Date().getFullYear().toString(),
    hectares: allExtractedData.hectares || 0,
    cultures: allExtractedData.cultures || [],
    blockIds: allExtractedData.blockIds?.map(block => block.id) || [],
    totalRevenue: 0, // We don't calculate revenue based on the AI output anymore
    historicalData: allExtractedData.historicalData || [],
    rawText: JSON.stringify(allExtractedData),
    dataUnavailable: !foundUsefulData
  };
}
