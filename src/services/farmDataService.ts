import { FarmData } from "@/components/LoanApplication";
import { supabase } from "@/integrations/supabase/client";

export const saveFarmDataToDatabase = async (farmData: FarmData, userId: string): Promise<string | null> => {
  try {
    if (!farmData || !userId) {
      console.error("Missing farm data or user ID");
      return null;
    }
    
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
      const { error: detailsError } = await supabase
        .from('farm_details')
        .insert({
          farm_id: farmId,
          market_prices: farmData.marketPrices,
          crop_type: farmData.year ? `${farmData.year} évi termés` : 'Jelenlegi termés'
        });
      
      if (detailsError) {
        console.error("Error saving farm details:", detailsError);
      }
    }
    
    // 3. Save each culture
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
