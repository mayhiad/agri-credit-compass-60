import { supabase } from "@/integrations/supabase/client";
import { HistoricalYear, FarmData } from "@/types/farm";

const defaultHistoricalData: HistoricalYear[] = [
  {
    year: "2022",
    totalHectares: 126.8,
    crops: [
      {
        name: "Őszi búza",
        hectares: 36.5,
        yield: 5.2,
        totalYield: 189.8,
        priceEUR: 210,
        revenueEUR: 39858
      },
      {
        name: "Kukorica",
        hectares: 42.3,
        yield: 8.1,
        totalYield: 342.63,
        priceEUR: 180,
        revenueEUR: 61673.4
      },
      {
        name: "Napraforgó",
        hectares: 48.0,
        yield: 2.9,
        totalYield: 139.2,
        priceEUR: 440,
        revenueEUR: 61248
      }
    ],
    totalRevenueEUR: 162779.4
  },
  {
    year: "2023",
    totalHectares: 130.2,
    crops: [
      {
        name: "Őszi búza",
        hectares: 38.2,
        yield: 5.4,
        totalYield: 206.28,
        priceEUR: 190,
        revenueEUR: 39193.2
      },
      {
        name: "Kukorica",
        hectares: 44.0,
        yield: 7.8,
        totalYield: 343.2,
        priceEUR: 170,
        revenueEUR: 58344
      },
      {
        name: "Napraforgó",
        hectares: 48.0,
        yield: 3.1,
        totalYield: 148.8,
        priceEUR: 430,
        revenueEUR: 63984
      }
    ],
    totalRevenueEUR: 161521.2
  }
];

export const fetchHistoricalData = async (userId: string, farmId?: string): Promise<HistoricalYear[]> => {
  try {
    // Placeholder for actual database query
    // In the real implementation, we would fetch from database
    console.log(`Fetching historical data for user ${userId} and farm ${farmId || 'any'}`);
    
    // Simulating a delay to mimic database fetch
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return defaultHistoricalData;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    return [];
  }
};

export const saveHistoricalData = async (
  userId: string, 
  farmId: string, 
  historicalData: HistoricalYear[]
): Promise<boolean> => {
  try {
    console.log(`Saving historical data for user ${userId} and farm ${farmId}`);
    console.log("Historical data:", historicalData);
    
    // In a real implementation, we would save to the database
    return true;
  } catch (error) {
    console.error("Error saving historical data:", error);
    return false;
  }
};

export const getHistoricalDataFromFarmDetails = async (
  farmId: string
): Promise<HistoricalYear[] | null> => {
  try {
    // Fetch farm details which might contain historical data
    const { data: farmDetails, error } = await supabase
      .from('farm_details')
      .select('*')
      .eq('farm_id', farmId)
      .single();
    
    if (error) {
      console.error("Error fetching farm details:", error);
      return null;
    }
    
    // If we have historical data in farm details, return it
    if (farmDetails && farmDetails.historical_data) {
      return farmDetails.historical_data;
    }
    
    return null;
  } catch (error) {
    console.error("Error retrieving historical data from farm details:", error);
    return null;
  }
};

export default { fetchHistoricalData, saveHistoricalData, getHistoricalDataFromFarmDetails };
