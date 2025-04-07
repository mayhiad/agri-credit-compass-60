
import { supabase } from "@/integrations/supabase/client";
import { HistoricalFarmData } from "@/components/dashboard/historical/HistoricalChart";

// Function to convert Supabase data to HistoricalFarmData
const convertToHistoricalData = (data: any[]): HistoricalFarmData[] => {
  return data.map(item => {
    // Create a structured historical data object
    return {
      year: item.year || "Ismeretlen",
      hectares: item.total_hectares || 0,
      totalRevenue: item.total_revenue || 0,
      totalRevenueEUR: item.total_revenue_eur || (item.total_revenue / 390) || 0,
      crops: item.crops?.map((crop: any) => ({
        name: crop.name || "Ismeretlen kultúra",
        hectares: crop.hectares || 0,
        yield: crop.yield_per_hectare || 0,
        revenue: crop.revenue || 0
      })) || []
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
      totalRevenue: Math.round(totalRevenue),
      totalRevenueEUR: Math.round(totalRevenue / 390), // Approximate HUF to EUR conversion
      crops
    });
  }
  
  return mockData;
};

// Function to fetch historical data from the database
export const fetchHistoricalData = async (userId: string): Promise<HistoricalFarmData[]> => {
  try {
    // Try to fetch the data from Supabase
    const { data, error } = await supabase
      .from('historical_farm_data')
      .select('*')
      .eq('user_id', userId)
      .order('year', { ascending: false });
    
    if (error) {
      console.error("Error fetching historical data:", error);
      // If there was an error, return mock data for now
      return generateMockHistoricalData(userId);
    }
    
    // If we got data from the database, convert and return it
    if (data && data.length > 0) {
      return convertToHistoricalData(data);
    }
    
    // If no data was found, return mock data
    return generateMockHistoricalData(userId);
  } catch (error) {
    console.error("Unexpected error fetching historical data:", error);
    // In case of any other error, return mock data
    return generateMockHistoricalData(userId);
  }
};
