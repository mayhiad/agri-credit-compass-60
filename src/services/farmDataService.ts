
import { FarmData } from "@/types/farm";
import { supabase } from "@/integrations/supabase/client";

export const saveFarmDataToDatabase = async (farmData: FarmData, userId: string): Promise<string | null> => {
  try {
    if (!farmData || !userId) {
      console.error("Missing farm data or user ID");
      return null;
    }
    
    console.log("Saving farm data to database:", farmData);
    
    // Remove any potential fallback/placeholder data
    const cultures = farmData.cultures?.filter(culture => 
      // Filter out fallback culture data
      !(culture.name === "Szántóföldi kultúra" && culture.hectares === 123.45)
    ) || [];
    
    // Calculate the total hectares based on actual cultures
    const totalHectares = cultures.reduce((sum, culture) => sum + (culture.hectares || 0), 0);
    
    // Calculate the total revenue based on cultures with estimatedRevenue
    const totalRevenue = cultures.reduce((sum, culture) => sum + (culture.estimatedRevenue || 0), 0);
    
    // 1. Save the main farm record
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .insert({
        user_id: userId,
        hectares: totalHectares > 0 ? totalHectares : (farmData.hectares || 0),
        total_revenue: totalRevenue > 0 ? totalRevenue : (farmData.totalRevenue || 0),
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
    
    // 2. Save the farm details (including market prices and historical data)
    let locationData: Record<string, any> = {};
    
    // Add historical years data if available
    if (farmData.historicalYears && farmData.historicalYears.length > 0) {
      locationData.historical_years = farmData.historicalYears;
      console.log(`Saved ${farmData.historicalYears.length} historical years to location_data`);
    } else if (farmData.historicalData && farmData.historicalData.length > 0) {
      locationData.historical_years = farmData.historicalData;
      console.log(`Saved ${farmData.historicalData.length} historical data records to location_data`);
    }
    
    // Convert marketPrices to a format compatible with JSON
    const marketPricesJson = farmData.marketPrices ? 
      farmData.marketPrices.map(price => ({
        culture: price.culture,
        averageYield: price.averageYield,
        price: price.price,
        trend: price.trend,
        lastUpdated: price.lastUpdated
      })) : [];
    
    const { error: detailsError } = await supabase
      .from('farm_details')
      .insert({
        farm_id: farmId,
        market_prices: marketPricesJson,
        location_data: locationData,
        crop_type: farmData.year ? `${farmData.year} évi termés` : 'Jelenlegi termés'
      });
    
    if (detailsError) {
      console.error("Error saving farm details:", detailsError);
    }
    
    // 3. Save OCR information (if available)
    if (farmData.ocrText || farmData.fileName || farmData.processingId) {
      const rawData = {
        farm_id: farmId,
        ocr_text: farmData.ocrText,
        file_name: farmData.fileName,
        file_size: farmData.fileSize,
        document_date: farmData.documentDate || farmData.submissionDate || farmData.year,
        extracted_blocks: farmData.blockIds,
        word_document_url: farmData.wordDocumentUrl,
        claude_response_url: farmData.claudeResponseUrl,
        processing_id: farmData.processingId
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
    if (cultures.length > 0) {
      const culturesToSave = cultures.map(culture => ({
        farm_id: farmId,
        name: culture.name,
        hectares: culture.hectares,
        estimated_revenue: culture.estimatedRevenue
      }));
      
      const { error: culturesError } = await supabase
        .from('cultures')
        .insert(culturesToSave);
      
      if (culturesError) {
        console.error("Error saving cultures:", culturesError);
      }
    }
    
    // Update the farm_id in the original data for reference
    farmData.farmId = farmId;
    
    return farmId;
  } catch (error) {
    console.error("Unexpected error saving farm data:", error);
    return null;
  }
};
