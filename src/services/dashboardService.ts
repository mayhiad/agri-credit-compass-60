
import { supabase } from "@/integrations/supabase/client";
import { FarmData, MarketPrice } from "@/types/farm";

/**
 * Fetch farm data for a specific user
 */
export const fetchFarmData = async (userId: string): Promise<{ data: FarmData | null, error: string | null }> => {
  try {
    // Fetch the latest farm entry for this user
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('*, cultures(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (farmError) {
      if (farmError.code === 'PGRST116') {
        // No data found, but not an error for us
        return { data: null, error: null };
      }
      console.error("Error fetching farm data:", farmError);
      return { data: null, error: farmError.message };
    }
    
    if (!farmData) {
      return { data: null, error: null };
    }
    
    // Fetch market prices for the farm's region
    const { data: marketPricesData, error: pricesError } = await supabase
      .from('market_prices')
      .select('*')
      .eq('region', farmData.region || 'Magyarország')
      .order('last_updated', { ascending: false });
    
    if (pricesError) {
      console.error("Error fetching market prices:", pricesError);
      // We continue even if we can't fetch prices
    }
    
    // Transform the data to match our FarmData interface
    const transformedFarmData: FarmData = {
      farmId: farmData.id,
      applicantName: null,
      region: farmData.region,
      documentId: farmData.document_id,
      hectares: farmData.hectares,
      cultures: farmData.cultures || [],
      totalRevenue: farmData.total_revenue,
      marketPrices: marketPricesData as MarketPrice[] || [],  // Type assertion to match our interface
    };
    
    // If we don't have market prices from the database, we generate some
    if (!transformedFarmData.marketPrices || transformedFarmData.marketPrices.length === 0) {
      const currentYear = new Date().getFullYear().toString();
      const generatedPrices: MarketPrice[] = [
        { 
          id: '1', 
          culture: 'Búza', 
          averageYield: 5.5, 
          price: 85000, 
          trend: 1, 
          last_updated: new Date().toISOString(), 
          region: farmData.region || 'Magyarország', 
          year: currentYear,
          is_forecast: false
        },
        { 
          id: '2', 
          culture: 'Kukorica', 
          averageYield: 8.2, 
          price: 75000, 
          trend: 2, 
          last_updated: new Date().toISOString(), 
          region: farmData.region || 'Magyarország', 
          year: currentYear,
          is_forecast: false
        },
        { 
          id: '3', 
          culture: 'Napraforgó', 
          averageYield: 3.2, 
          price: 160000, 
          trend: -1, 
          last_updated: new Date().toISOString(), 
          region: farmData.region || 'Magyarország', 
          year: currentYear,
          is_forecast: false
        }
      ];
      
      transformedFarmData.marketPrices = generatedPrices;
    }
    
    return { data: transformedFarmData, error: null };
  } catch (error) {
    console.error("Farm data fetch error:", error);
    return { data: null, error: "Hiba a gazdasági adatok lekérésekor" };
  }
};
