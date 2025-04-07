
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

    // Build market price data
    const marketPriceData = farmDetails?.market_prices && 
      Array.isArray(farmDetails.market_prices) ? 
      farmDetails.market_prices.map((price: any) => ({
        culture: price.culture,
        averageYield: price.averageYield,
        price: price.price,
        trend: price.trend,
        lastUpdated: new Date(price.lastUpdated || new Date().toISOString())
      })) : [];
    
    // Build farm data
    const farmData: FarmData = {
      hectares: farm.hectares,
      cultures: cultures?.map(culture => ({
        name: culture.name,
        hectares: culture.hectares,
        estimatedRevenue: culture.estimated_revenue
      })) || [],
      totalRevenue: farm.total_revenue,
      region: farm.region || "Ismeretlen régió",
      documentId: farm.document_id || `SAPS-2023-${userId.substring(0, 6)}`,
      applicantName: userId.split('@')[0] || "Ismeretlen felhasználó",
      blockIds: [`K-${userId.substring(0, 4)}`, `L-${userId.substring(4, 8)}`],
      marketPrices: marketPriceData as MarketPrice[]
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
