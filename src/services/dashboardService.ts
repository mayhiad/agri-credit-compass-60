
import { supabase } from "@/integrations/supabase/client";
import { FarmData, MarketPrice } from "@/types/farm";

export const fetchFarmData = async (userId: string): Promise<{
  data: FarmData | null;
  error: string | null;
}> => {
  try {
    // Fetch user-specific farm data from Supabase
    const { data: farms, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })  // Get the most recent farm
      .limit(1);  // Only get one result

    if (farmError) {
      console.error("Hiba a farm adatok lekérésekor:", farmError);
      return { 
        data: null, 
        error: "Adatbázis hiba történt. Kérjük próbálja újra később." 
      };
    }

    // If no farm data, return
    if (!farms || farms.length === 0) {
      return { data: null, error: null };
    }

    const farm = farms[0]; // Get the first (most recent) farm

    // Fetch detailed market prices
    const { data: farmDetails, error: marketPricesError } = await supabase
      .from('farm_details')
      .select('market_prices')
      .eq('farm_id', farm.id)
      .single();

    if (marketPricesError && marketPricesError.code !== 'PGRST116') {
      console.error("Hiba a piaci árak lekérésekor:", marketPricesError);
    }

    // Fetch cultures
    const { data: cultures, error: culturesError } = await supabase
      .from('cultures')
      .select('*')
      .eq('farm_id', farm.id);

    if (culturesError) {
      console.error("Hiba a kultúrák lekérésekor:", culturesError);
    }

    // Fetch the most relevant document extraction result for this farm
    const { data: extractionResults, error: extractionError } = await supabase
      .from('document_extraction_results')
      .select('extracted_data, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (extractionError) {
      console.error("Hiba az SAPS adatok lekérésekor:", extractionError);
    }
    
    // Find the extraction result that matches the farm_id
    let extractedMetadata = null;
    
    if (extractionResults && extractionResults.length > 0) {
      // First try to find a result that matches the farm_id
      const matchingResult = extractionResults.find(result => {
        if (result.extracted_data && 
            typeof result.extracted_data === 'object' && 
            !Array.isArray(result.extracted_data)) {
          // Safely check if farm_id exists and matches
          return 'farm_id' in result.extracted_data && 
                 result.extracted_data.farm_id === farm.id;
        }
        return false;
      });
      
      if (matchingResult) {
        extractedMetadata = matchingResult.extracted_data;
        console.log("Found matching extraction result for farm:", farm.id);
      } else if (farm.document_id) {
        // If no direct farm_id match, try to match by document_id
        // Look at the most recent results to find one with matching document info
        for (const result of extractionResults) {
          if (result.extracted_data && 
              typeof result.extracted_data === 'object' && 
              !Array.isArray(result.extracted_data) &&
              'document_id' in result.extracted_data && 
              result.extracted_data.document_id === farm.document_id) {
            extractedMetadata = result.extracted_data;
            console.log("Found extraction result matching document_id:", farm.document_id);
            break;
          }
        }
      }
      
      // If still no match, use the most recent extraction result
      if (!extractedMetadata && extractionResults[0].extracted_data) {
        // Make sure it's a proper object before using it
        if (typeof extractionResults[0].extracted_data === 'object' && 
            !Array.isArray(extractionResults[0].extracted_data)) {
          extractedMetadata = extractionResults[0].extracted_data;
          console.log("Using most recent extraction result as fallback");
        }
      }
    }

    // Build market price data - no fallbacks, only real data or empty array
    const marketPriceData = farmDetails?.market_prices && 
      Array.isArray(farmDetails.market_prices) ? 
      farmDetails.market_prices.map((price: any) => ({
        culture: price.culture,
        averageYield: price.averageYield,
        price: price.price,
        trend: price.trend,
        lastUpdated: new Date(price.lastUpdated || new Date().toISOString())
      })) : [];
    
    // Build farm data with NO fallbacks, only real data or N/A
    const farmData: FarmData = {
      // Core farm data
      hectares: farm.hectares,
      cultures: cultures?.map(culture => ({
        name: culture.name,
        hectares: culture.hectares,
        estimatedRevenue: culture.estimated_revenue
      })) || [],
      totalRevenue: farm.total_revenue,
      region: farm.region || "N/A",
      
      // Document data - only use real data from database, no fallbacks
      documentId: farm.document_id || "N/A",
      applicantName: "N/A",
      submitterId: "N/A",
      applicantId: "N/A",
      submissionDate: "N/A",
      year: "N/A",
      blockIds: [],
      marketPrices: marketPriceData as MarketPrice[],
    };
    
    // Add extracted metadata if available
    if (extractedMetadata && typeof extractedMetadata === 'object' && !Array.isArray(extractedMetadata)) {
      // We've extracted these fields from the document, so use them
      farmData.applicantName = extractedMetadata.applicant_name || "N/A";
      farmData.submitterId = extractedMetadata.submitter_id || "N/A";
      farmData.applicantId = extractedMetadata.applicant_id || "N/A";
      farmData.submissionDate = extractedMetadata.submission_date || "N/A";
      farmData.year = extractedMetadata.year || "N/A";
      farmData.blockIds = Array.isArray(extractedMetadata.block_ids) ? extractedMetadata.block_ids : [];
      
      // Add any additional metadata fields
      farmData.processingId = extractedMetadata.processing_id;
      farmData.claudeResponseUrl = extractedMetadata.claude_response_url;
      farmData.fileName = extractedMetadata.file_name;
      farmData.fileSize = extractedMetadata.file_size;
      farmData.documentDate = extractedMetadata.document_date;
      
      console.log("Added extracted metadata to farm data", { 
        farmId: farm.id,
        documentId: farm.document_id, 
        applicantName: farmData.applicantName
      });
    }
    
    return { data: farmData, error: null };
  } catch (error) {
    console.error("Váratlan hiba a farm adatok lekérésekor:", error);
    return { 
      data: null, 
      error: "Váratlan hiba történt az adatok betöltése során. Kérjük próbálja újra később." 
    };
  }
};
