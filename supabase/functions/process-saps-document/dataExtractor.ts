
// Data extraction helper for Claude responses
import { supabase } from "./openaiClient.ts";
import { FarmData } from "./types.ts";

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
      // Try to find JSON data in the response
      // We're looking for the second part of the response which should be JSON
      const jsonMatch = rawText.match(/\{[\s\S]*"adminisztracios_adatok"[\s\S]*\}/);
      if (jsonMatch) {
        const jsonData = jsonMatch[0];
        try {
          const magyarData = JSON.parse(jsonData);
          
          // Convert from Hungarian to English field names for our system
          extractedData = {
            applicantName: magyarData.adminisztracios_adatok?.beado_nev,
            submitterId: magyarData.adminisztracios_adatok?.beado_ugyfel_azonosito,
            applicantId: magyarData.adminisztracios_adatok?.kerelmezo_ugyfel_azonosito,
            documentId: magyarData.adminisztracios_adatok?.iratazonosito,
            submissionDate: magyarData.adminisztracios_adatok?.beadas_idopont,
            year: magyarData.adminisztracios_adatok?.targyev,
            region: null, // Not directly in the Hungarian format
            hectares: magyarData.targyevi_adatok?.osszesitesek?.osszes_mezogazdasagi_terulet_ha || 0,
            
            // Convert Hungarian cultures to our format
            cultures: (magyarData.targyevi_adatok?.kulturak || []).map(k => ({
              name: k.nev ? (k.kod ? `${k.kod} - ${k.nev}` : k.nev) : (k.kod || "Ismeretlen"),
              hectares: k.terulet_ha || 0,
              estimatedRevenue: 0 // Will be calculated later
            })),
            
            // Convert block IDs
            blockIds: (magyarData.blokkazonositok || []).map(b => b.kod),
            
            // Convert historical data
            historicalData: magyarData.historikus_adatok?.evek.map(ev => {
              const yearData = {
                year: ev.toString(),
                totalHectares: 0,
                crops: []
              };
              
              // Get crops for this year
              magyarData.historikus_adatok.kulturak.forEach(kultura => {
                const evAdat = kultura.adatok.find(a => a.ev.toString() === ev.toString());
                if (evAdat) {
                  yearData.crops.push({
                    name: kultura.nev,
                    hectares: evAdat.terulet_ha || 0,
                    yield: evAdat.termesmenny_t ? (evAdat.termesmenny_t / evAdat.terulet_ha) : 0,
                    totalYield: evAdat.termesmenny_t || 0
                  });
                  yearData.totalHectares += evAdat.terulet_ha || 0;
                }
              });
              
              return yearData;
            }),
            
            totalRevenue: 0 // Will be calculated later
          };
          
          console.log(`✅ Structured data extracted from Hungarian JSON format`);
        } catch (jsonParseError) {
          console.error(`❌ Error parsing Hungarian JSON format: ${jsonParseError.message}`);
          // If Hungarian format fails, try to fall back to English parsing
          tryFallbackJsonExtraction(rawText, extractedData);
        }
      } else {
        console.warn(`⚠️ Could not extract Hungarian JSON format, trying fallback extraction`);
        tryFallbackJsonExtraction(rawText, extractedData);
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

// Helper function to try fallback JSON extraction (old format)
function tryFallbackJsonExtraction(rawText, extractedData) {
  // Try to extract JSON from the text response (fallback to original English format)
  const fallbackJsonMatch = rawText.match(/\{[\s\S]*"applicantName"[\s\S]*\}/);
  if (fallbackJsonMatch) {
    try {
      const parsedData = JSON.parse(fallbackJsonMatch[0]);
      Object.assign(extractedData, parsedData);
      console.log(`✅ Data extracted via fallback method`);
    } catch (fallbackError) {
      console.error(`❌ Fallback JSON parsing error: ${fallbackError.message}`);
    }
  } else {
    console.warn(`⚠️ Could not extract any JSON data from the response`);
  }
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
export function createFarmDataStructure(allExtractedData: any, foundUsefulData: boolean): FarmData {
  // Make sure we have some valid data
  const validData = allExtractedData && typeof allExtractedData === 'object';
  
  const farmData: FarmData = {
    applicantName: validData ? allExtractedData.applicantName || null : null,
    submitterId: validData ? allExtractedData.submitterId || null : null,
    applicantId: validData ? allExtractedData.applicantId || null : null,
    documentId: validData ? allExtractedData.documentId || null : null,
    submissionDate: validData ? allExtractedData.submissionDate || null : null,
    region: validData ? allExtractedData.region || null : null,
    year: validData ? allExtractedData.year || new Date().getFullYear().toString() : new Date().getFullYear().toString(),
    hectares: validData && typeof allExtractedData.hectares === 'number' ? allExtractedData.hectares : 0,
    cultures: validData && Array.isArray(allExtractedData.cultures) ? allExtractedData.cultures : [],
    blockIds: validData && Array.isArray(allExtractedData.blockIds) ? allExtractedData.blockIds : [],
    totalRevenue: 0, // We don't calculate revenue based on the AI output anymore
    historicalData: validData && Array.isArray(allExtractedData.historicalData) ? allExtractedData.historicalData : [],
    rawText: validData ? JSON.stringify(allExtractedData) : "{}",
    dataUnavailable: !foundUsefulData
  };
  
  return farmData;
}
