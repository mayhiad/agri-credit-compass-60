
import { supabase } from "@/integrations/supabase/client";
import { FarmData, MarketPrice } from "@/types/farm";

/**
 * Save farm data to the database
 */
export const saveFarmDataToDatabase = async (farmData: FarmData, userId: string): Promise<string | null> => {
  try {
    // First, create or update the farm record
    const { data: farmRecord, error: farmError } = await supabase
      .from('farms')
      .upsert({
        user_id: userId,
        hectares: farmData.hectares,
        document_id: farmData.documentId,
        region: farmData.region,
        total_revenue: farmData.totalRevenue
      })
      .select('id')
      .single();

    if (farmError) {
      console.error("Error saving farm data:", farmError);
      throw farmError;
    }

    const farmId = farmRecord.id;
    
    // Next, save the cultures
    if (farmData.cultures && farmData.cultures.length > 0) {
      // Delete existing cultures for this farm to avoid duplicates
      await supabase
        .from('cultures')
        .delete()
        .eq('farm_id', farmId);
      
      // Insert new cultures
      const { error: culturesError } = await supabase
        .from('cultures')
        .insert(farmData.cultures.map(culture => ({
          farm_id: farmId,
          name: culture.name,
          hectares: culture.hectares,
          estimated_revenue: culture.estimatedRevenue
        })));
      
      if (culturesError) {
        console.error("Error saving cultures:", culturesError);
        throw culturesError;
      }
    }
    
    // Save market prices if available and we have a region
    if (farmData.marketPrices && farmData.marketPrices.length > 0 && farmData.region) {
      // Check if market prices for this region and year already exist
      const year = farmData.year || new Date().getFullYear().toString();
      
      const { data: existingPrices } = await supabase
        .from('market_prices')
        .select('id')
        .eq('region', farmData.region)
        .eq('year', year);
      
      // Only insert if no prices exist for this region and year
      if (!existingPrices || existingPrices.length === 0) {
        const { error: pricesError } = await supabase
          .from('market_prices')
          .insert(farmData.marketPrices.map(price => ({
            culture: price.culture,
            average_yield: price.averageYield,
            price: price.price,
            trend: price.trend,
            region: farmData.region,
            year: year,
            is_forecast: price.is_forecast,
            last_updated: price.last_updated
          })));
        
        if (pricesError) {
          console.error("Error saving market prices:", pricesError);
          // Continue even if market prices save fails
        }
      }
    }
    
    // Save additional farm details if needed
    if (farmData.blockIds && farmData.blockIds.length > 0) {
      const { error: detailsError } = await supabase
        .from('farm_details')
        .upsert({
          farm_id: farmId,
          location_data: { blockIds: farmData.blockIds }
        });
      
      if (detailsError) {
        console.error("Error saving farm details:", detailsError);
        // Continue even if details save fails
      }
    }
    
    return farmId;
  } catch (error) {
    console.error("Error in saveFarmDataToDatabase:", error);
    return null;
  }
};
