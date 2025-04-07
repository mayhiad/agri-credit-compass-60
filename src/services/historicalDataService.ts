
import { HistoricalCrop, HistoricalYear } from "@/types/farm";
import { supabase } from "@/integrations/supabase/client";

// Generate mock historical data for testing purposes
export function generateMockHistoricalData(userId: string): HistoricalYear[] {
  const currentYear = new Date().getFullYear();
  
  // Common crops to use in mock data
  const commonCrops = [
    { name: "Búza", baseYield: 5.5, basePrice: 85000 },
    { name: "Kukorica", baseYield: 8.0, basePrice: 70000 },
    { name: "Napraforgó", baseYield: 3.0, basePrice: 160000 },
    { name: "Repce", baseYield: 3.2, basePrice: 170000 },
    { name: "Árpa", baseYield: 5.0, basePrice: 75000 }
  ];
  
  // Create mock data for the past 5 years
  const mockData: HistoricalYear[] = [];
  
  for (let i = 5; i > 0; i--) {
    const year = (currentYear - i).toString();
    
    // Randomly select 2-4 crops for the year
    const cropCount = Math.floor(Math.random() * 3) + 2; // Random 2-4 crops
    const selectedCrops: HistoricalCrop[] = [];
    const usedCrops = new Set<number>();
    
    let totalHectares = 0;
    let totalRevenue = 0;
    
    // Create the selected number of crops
    for (let j = 0; j < cropCount; j++) {
      // Pick a crop that hasn't been used yet for this year
      let cropIndex;
      do {
        cropIndex = Math.floor(Math.random() * commonCrops.length);
      } while (usedCrops.has(cropIndex) && usedCrops.size < commonCrops.length);
      
      usedCrops.add(cropIndex);
      const crop = commonCrops[cropIndex];
      
      // Calculate random hectares between 20 and 100
      const hectares = Math.floor(Math.random() * 80) + 20;
      totalHectares += hectares;
      
      // Vary the yield and price slightly each year
      const yieldVariation = 0.85 + (Math.random() * 0.3); // 85% to 115%
      const priceVariation = 0.9 + (Math.random() * 0.2); // 90% to 110%
      
      const yieldPerHectare = crop.baseYield * yieldVariation;
      const pricePerTon = crop.basePrice * priceVariation;
      
      // Calculate total yield and revenue
      const totalYield = hectares * yieldPerHectare;
      const revenue = totalYield * pricePerTon;
      totalRevenue += revenue;
      
      // Add the crop to the list
      selectedCrops.push({
        name: crop.name,
        hectares: hectares,
        yield: yieldPerHectare,
        totalYield: totalYield,
        priceEUR: Math.round(pricePerTon / 390), // Rough conversion to EUR
        revenueEUR: Math.round(revenue / 390) // Rough conversion to EUR
      });
    }
    
    // Add the year data to the mock data
    mockData.push({
      year: year,
      totalHectares: totalHectares,
      crops: selectedCrops,
      totalRevenueEUR: Math.round(totalRevenue / 390) // Rough conversion to EUR
    });
  }
  
  return mockData;
}

/**
 * Converts historical data to our application format
 */
export function convertToHistoricalData(data: any): HistoricalYear[] {
  if (!data || !Array.isArray(data)) {
    return [];
  }
  
  return data.map(year => {
    // Ensure each year has the required properties
    return {
      year: year.year || new Date().getFullYear().toString(),
      totalHectares: year.totalHectares || 0,
      crops: Array.isArray(year.crops) ? year.crops.map(crop => ({
        name: crop.name || "Ismeretlen",
        hectares: crop.hectares || 0,
        yield: crop.yield || 0,
        totalYield: crop.totalYield || 0,
        priceEUR: crop.priceEUR || 0,
        revenueEUR: crop.revenueEUR || 0
      })) : [],
      totalRevenueEUR: year.totalRevenueEUR || 0
    };
  });
}

/**
 * Retrieves historical farm data for a specific user or farm
 */
export async function fetchHistoricalData(farmData: any, userId: string): Promise<HistoricalYear[]> {
  try {
    if (!farmData || !farmData.id) {
      return generateMockHistoricalData(userId);
    }
    
    // First attempt: check farm_details for historical data
    const { data: farmDetails, error: detailsError } = await supabase
      .from('farm_details')
      .select('*')
      .eq('farm_id', farmData.id)
      .single();
    
    // If a farm_details record exists and it has historical data in a JSON column
    if (!detailsError && farmDetails) {
      // Check if historical data exists in JSON columns (carefully handling types)
      const marketPricesData = farmDetails.market_prices as any;
      const locationData = farmDetails.location_data as any;
      
      // Try to find historical data in various places
      const historicalDataFromJson = 
        (marketPricesData && typeof marketPricesData === 'object' && marketPricesData.historicalData) || 
        (locationData && typeof locationData === 'object' && locationData.historicalData);
      
      if (historicalDataFromJson) {
        return convertToHistoricalData(historicalDataFromJson);
      }
    }
    
    // If no data is found in any table, generate mock data
    console.log("No historical data found in any table, using mock data");
    return generateMockHistoricalData(userId);
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return generateMockHistoricalData(userId);
  }
}
