
import { supabase } from "@/integrations/supabase/client";
import { HistoricalFarmData, HistoricalCrop } from "@/components/dashboard/historical/types";
import { FarmData, HistoricalYear } from "@/types/farm";

// Function to convert Supabase data to HistoricalFarmData
const convertToHistoricalData = (data: HistoricalYear[]): HistoricalFarmData[] => {
  return data.map(item => {
    // Convert crops to the required format
    const crops: HistoricalCrop[] = item.crops.map(crop => ({
      name: crop.name,
      hectares: crop.hectares,
      yield: crop.yield,
      totalYield: crop.totalYield,
      pricePerTon: crop.priceEUR,
      revenue: crop.revenueEUR ? crop.revenueEUR * 390 : undefined, // Convert EUR to HUF
      revenueEUR: crop.revenueEUR
    }));

    // Create a structured historical data object
    return {
      year: item.year,
      hectares: item.totalHectares,
      totalHectares: item.totalHectares,
      totalRevenue: item.totalRevenueEUR ? item.totalRevenueEUR * 390 : 0, // Convert EUR to HUF
      totalRevenueEUR: item.totalRevenueEUR || 0,
      crops
    };
  });
};

// Mock data generator for testing
const generateMockHistoricalData = (userId: string): HistoricalFarmData[] => {
  const currentYear = new Date().getFullYear();
  const mockData: HistoricalFarmData[] = [];
  
  // Generate some increasing trend data for the past 5 years
  for (let i = 5; i >= 1; i--) {
    const year = (currentYear - i).toString();
    const baseFactor = 1 + (5 - i) * 0.1; // Growth factor
    
    // Generate some crops with random variations
    const crops = [
      {
        name: "Búza",
        hectares: 35 * baseFactor + (Math.random() * 10 - 5),
        yield: 5.2 + (Math.random() * 0.8 - 0.4),
        revenue: 15000000 * baseFactor + (Math.random() * 2000000 - 1000000)
      },
      {
        name: "Kukorica",
        hectares: 42 * baseFactor + (Math.random() * 12 - 6),
        yield: 8.1 + (Math.random() * 1.2 - 0.6),
        revenue: 23000000 * baseFactor + (Math.random() * 3000000 - 1500000)
      },
      {
        name: "Napraforgó",
        hectares: 28 * baseFactor + (Math.random() * 8 - 4),
        yield: 3.0 + (Math.random() * 0.6 - 0.3),
        revenue: 18000000 * baseFactor + (Math.random() * 2500000 - 1250000)
      }
    ];
    
    // Calculate totals
    const totalHectares = crops.reduce((sum, crop) => sum + crop.hectares, 0);
    const totalRevenue = crops.reduce((sum, crop) => sum + crop.revenue, 0);
    
    mockData.push({
      year,
      hectares: parseFloat(totalHectares.toFixed(2)),
      totalHectares: parseFloat(totalHectares.toFixed(2)),
      totalRevenue: Math.round(totalRevenue),
      totalRevenueEUR: Math.round(totalRevenue / 390), // Approximate HUF to EUR conversion
      crops
    });
  }
  
  return mockData;
};

// Function to fetch historical data from the database or FarmData
export const fetchHistoricalData = async (userId: string): Promise<HistoricalFarmData[]> => {
  try {
    // First try to get the latest farm data
    const { data: farmData, error: farmError } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (farmError) {
      console.error("Error fetching farm data:", farmError);
      // If there was an error, return mock data for now
      return generateMockHistoricalData(userId);
    }
    
    // Check if we have historical data in a JSON column or metadata of the farm data
    // This approach depends on how your data is actually structured in Supabase
    
    // First attempt: check farm_details for historical data
    const { data: farmDetails, error: detailsError } = await supabase
      .from('farm_details')
      .select('*')
      .eq('farm_id', farmData.id)
      .single();
    
    // If a farm_details record exists and it has historical data in a JSON column
    if (!detailsError && farmDetails) {
      // Check if historical data exists in some JSON column (adjust property name as needed)
      const historicalDataFromJson = farmDetails.market_prices?.historicalData || 
                                    farmDetails.location_data?.historicalData;
      
      if (historicalDataFromJson) {
        return convertToHistoricalData(historicalDataFromJson);
      }
    }
    
    // If no data is found in any table, generate mock data
    console.log("No historical data found in any table, using mock data");
    return generateMockHistoricalData(userId);
  } catch (error) {
    console.error("Unexpected error fetching historical data:", error);
    // In case of any other error, return mock data
    return generateMockHistoricalData(userId);
  }
};
