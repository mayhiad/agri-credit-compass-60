
import { FarmData } from "@/types/farm";
import { supabase } from "@/integrations/supabase/client";

export const saveFarmDataToDatabase = async (farmData: FarmData, userId: string): Promise<string | null> => {
  try {
    if (!farmData || !userId) {
      console.error("Missing farm data or user ID");
      return null;
    }
    
    console.log("Saving farm data to database:", farmData);
    
    // 1. Save the main farm record
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .insert({
        user_id: userId,
        hectares: farmData.hectares,
        total_revenue: farmData.totalRevenue,
        document_id: farmData.documentId,
        region: farmData.region
      })
      .select('id')
      .single();
    
    if (farmError) {
      console.error("Error saving farm data:", farmError);
      return null;
    }
    
    const farmId = farm.id;
    console.log(`Farm record created with ID: ${farmId}`);
    
    // 2. Save the farm details (including market prices)
    if (farmData.marketPrices && farmData.marketPrices.length > 0) {
      // Convert MarketPrice objects to format compatible with JSON storage
      const marketPricesForJson = farmData.marketPrices.map(price => ({
        culture: price.culture,
        averageYield: price.averageYield,
        price: price.price,
        trend: price.trend,
        lastUpdated: price.lastUpdated instanceof Date ? price.lastUpdated.toISOString() : price.lastUpdated
      }));

      const { error: detailsError } = await supabase
        .from('farm_details')
        .insert({
          farm_id: farmId,
          market_prices: marketPricesForJson,
          crop_type: farmData.year ? `${farmData.year} évi termés` : 'Jelenlegi termés'
        });
      
      if (detailsError) {
        console.error("Error saving farm details:", detailsError);
      }
    }
    
    // 3. Save OCR information (if available)
    if (farmData.ocrText || farmData.fileName) {
      const rawData = {
        farm_id: farmId,
        ocr_text: farmData.ocrText,
        file_name: farmData.fileName,
        file_size: farmData.fileSize,
        document_date: farmData.documentDate || farmData.year,
        extracted_blocks: farmData.blockIds,
        word_document_url: farmData.wordDocumentUrl
      };
      
      console.log("Saving OCR information:", rawData);
      
      // Don't let this block the operation if it fails
      try {
        const { error: ocrError } = await supabase
          .from('document_extraction_results')
          .insert({
            user_id: userId,
            extracted_data: rawData,
            processing_status: 'completed',
            ocr_log_id: '00000000-0000-0000-0000-000000000000' // Placeholder since we don't have the actual log ID
          });
          
        if (ocrError) {
          console.warn("Warning: Could not save OCR information:", ocrError);
        }
      } catch (ocrSaveError) {
        console.warn("Error saving OCR information:", ocrSaveError);
      }
    }
    
    // 4. Save each culture
    if (farmData.cultures && farmData.cultures.length > 0) {
      const cultures = farmData.cultures.map(culture => ({
        farm_id: farmId,
        name: culture.name,
        hectares: culture.hectares,
        estimated_revenue: culture.estimatedRevenue
      }));
      
      const { error: culturesError } = await supabase
        .from('cultures')
        .insert(cultures);
      
      if (culturesError) {
        console.error("Error saving cultures:", culturesError);
      }
    }
    
    return farmId;
  } catch (error) {
    console.error("Unexpected error saving farm data:", error);
    return null;
  }
};
