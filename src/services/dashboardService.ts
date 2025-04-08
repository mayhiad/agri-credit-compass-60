
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

    // Fetch extra farm metadata from document_extraction_results if available
    const { data: extractionResults, error: extractionError } = await supabase
      .from('document_extraction_results')
      .select('extracted_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (extractionError) {
      console.error("Hiba az SAPS adatok lekérésekor:", extractionError);
    }
    
    // Get extracted farm metadata if available
    let extractedMetadata = null;
    if (extractionResults && extractionResults.length > 0 && extractionResults[0].extracted_data?.farm_id === farm.id) {
      extractedMetadata = extractionResults[0].extracted_data;
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
      
      // Extra metadata from document extraction if available
      ...(extractedMetadata && {
        applicantName: extractedMetadata.applicant_name || "N/A",
        submitterId: extractedMetadata.submitter_id || "N/A",
        applicantId: extractedMetadata.applicant_id || "N/A",
        submissionDate: extractedMetadata.submission_date || "N/A",
        year: extractedMetadata.year || "N/A",
        blockIds: extractedMetadata.block_ids || [],
        processingId: extractedMetadata.processing_id,
        claudeResponseUrl: extractedMetadata.claude_response_url,
        fileName: extractedMetadata.file_name,
        fileSize: extractedMetadata.file_size,
        documentDate: extractedMetadata.document_date
      })
    };
    
    return { data: farmData, error: null };
  } catch (error) {
    console.error("Váratlan hiba a farm adatok lekérésekor:", error);
    return { 
      data: null, 
      error: "Váratlan hiba történt az adatok betöltése során. Kérjük próbálja újra később." 
    };
  }
};
