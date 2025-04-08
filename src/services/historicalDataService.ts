
import { supabase } from "@/integrations/supabase/client";
import { HistoricalYear, FarmData } from "@/types/farm";

export const fetchHistoricalData = async (userId: string, farmId?: string): Promise<HistoricalYear[]> => {
  try {
    console.log(`Fetching historical data for user ${userId} and farm ${farmId || 'any'}`);
    
    // Fetching from database - actual implementation
    const { data, error } = await supabase
      .from('farms')
      .select('historical_data')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (error) {
      console.error("Error fetching historical data:", error);
      return [];
    }
    
    if (data && data.length > 0 && data[0].historical_data) {
      return data[0].historical_data;
    }
    
    return [];
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
    
    const { error } = await supabase
      .from('farms')
      .update({ historical_data: historicalData })
      .eq('id', farmId)
      .eq('user_id', userId);
      
    if (error) {
      console.error("Error saving historical data:", error);
      return false;
    }
    
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
    // Fetch farm details
    const { data: farmDetails, error } = await supabase
      .from('farm_details')
      .select('*')
      .eq('farm_id', farmId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching farm details:", error);
      return null;
    }
    
    // Try to find historical data in the farm details
    if (farmDetails && farmDetails.location_data) {
      // Check if historical_data is in location_data (sometimes it's stored there)
      const locationData = farmDetails.location_data as any;
      if (locationData.historical_data) {
        return locationData.historical_data;
      }
    }
    
    // If not found in farm_details, try the farms table directly
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('historical_data')
      .eq('id', farmId)
      .maybeSingle();
      
    if (farmError) {
      console.error("Error fetching farm:", farmError);
      return null;
    }
    
    if (farm && farm.historical_data) {
      return farm.historical_data;
    }
    
    return null;
  } catch (error) {
    console.error("Error retrieving historical data from farm details:", error);
    return null;
  }
};

export default { fetchHistoricalData, saveHistoricalData, getHistoricalDataFromFarmDetails };
