
import { supabase } from "@/integrations/supabase/client";
import { HistoricalYear, FarmData } from "@/types/farm";

export const fetchHistoricalData = async (userId: string, farmId?: string): Promise<HistoricalYear[]> => {
  try {
    console.log(`Fetching historical data for user ${userId} and farm ${farmId || 'any'}`);
    
    // First, try to get historical data from farm_details table where it's more likely to be stored
    const { data: farmDetailsData, error: farmDetailsError } = await supabase
      .from('farm_details')
      .select('location_data')
      .eq('farm_id', farmId || '')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (!farmDetailsError && farmDetailsData && farmDetailsData.length > 0 && farmDetailsData[0].location_data) {
      const locationData = farmDetailsData[0].location_data as any;
      if (locationData.historical_years && Array.isArray(locationData.historical_years)) {
        return locationData.historical_years;
      }
    }
    
    // If no data found and no specific farmId was provided, check all farm_details for this user
    if (!farmId) {
      const { data: farmsData, error: farmsError } = await supabase
        .from('farms')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
        
      if (!farmsError && farmsData && farmsData.length > 0) {
        // Check each farm for historical data
        for (const farm of farmsData) {
          const historicalData = await getHistoricalDataFromFarmDetails(farm.id);
          if (historicalData && historicalData.length > 0) {
            return historicalData;
          }
        }
      }
    }
    
    // If still no data, return empty array
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
    
    // Check if farm_details exists for this farm
    const { data: farmDetails, error: farmDetailsError } = await supabase
      .from('farm_details')
      .select('id, location_data')
      .eq('farm_id', farmId)
      .maybeSingle();
    
    if (farmDetailsError && farmDetailsError.code !== 'PGRST116') {
      console.error("Error checking farm_details:", farmDetailsError);
      return false;
    }
    
    if (farmDetails) {
      // Farm details exists, update it
      const locationData = farmDetails.location_data || {};
      
      // Convert location_data to object if it's a string
      const updatedLocationData = typeof locationData === 'string' 
        ? JSON.parse(locationData) 
        : { ...(locationData as Record<string, any>) };
      
      // Add historical years to location_data
      updatedLocationData.historical_years = historicalData;
      
      const { error: updateError } = await supabase
        .from('farm_details')
        .update({ 
          location_data: updatedLocationData 
        })
        .eq('id', farmDetails.id);
        
      if (updateError) {
        console.error("Error updating historical data:", updateError);
        return false;
      }
    } else {
      // Farm details doesn't exist, create it
      const locationData: Record<string, any> = { 
        historical_years: historicalData 
      };
      
      const { error: insertError } = await supabase
        .from('farm_details')
        .insert({
          farm_id: farmId,
          location_data: locationData
        });
        
      if (insertError) {
        console.error("Error creating historical data:", insertError);
        return false;
      }
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
      .select('location_data')
      .eq('farm_id', farmId)
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching farm details:", error);
      return null;
    }
    
    // Try to find historical data in the farm details
    if (farmDetails && farmDetails.location_data) {
      // Check if historical_years is in location_data
      const locationData = farmDetails.location_data as any;
      if (locationData.historical_years && Array.isArray(locationData.historical_years)) {
        return locationData.historical_years;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error retrieving historical data from farm details:", error);
    return null;
  }
};

export default { fetchHistoricalData, saveHistoricalData, getHistoricalDataFromFarmDetails };
