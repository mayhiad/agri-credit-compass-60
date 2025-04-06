
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/components/LoanApplication";

/**
 * Saves the processed farm data to the database
 */
export const saveFarmDataToDatabase = async (farmData: FarmData, userId: string): Promise<string | null> => {
  if (!userId) {
    console.error("Nincs bejelentkezett felhasználó");
    return null;
  }
  
  // Validate required fields before saving
  if (typeof farmData.hectares !== 'number' || isNaN(farmData.hectares)) {
    throw new Error("A hektárszám hiányzik vagy érvénytelen");
  }
  
  if (typeof farmData.totalRevenue !== 'number' || isNaN(farmData.totalRevenue)) {
    throw new Error("A teljes bevétel hiányzik vagy érvénytelen");
  }
  
  if (!farmData.region) {
    farmData.region = "Ismeretlen régió";
  }
  
  if (!farmData.documentId) {
    farmData.documentId = `SAPS-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;
  }
  
  try {
    // Elmentjük a farm adatokat
    const { data: farmRecord, error: farmError } = await supabase
      .from('farms')
      .insert({
        user_id: userId,
        hectares: farmData.hectares,
        total_revenue: farmData.totalRevenue,
        region: farmData.region,
        document_id: farmData.documentId
      })
      .select()
      .single();
    
    if (farmError) throw farmError;
    
    if (!farmRecord) {
      throw new Error("Nem sikerült létrehozni a farm rekordot");
    }
    
    // Elmentjük a kultúrákat
    if (farmData.cultures && farmData.cultures.length > 0) {
      const culturesData = farmData.cultures.map(culture => ({
        farm_id: farmRecord.id,
        name: culture.name,
        hectares: culture.hectares,
        estimated_revenue: culture.estimatedRevenue
      }));
      
      const { error: culturesError } = await supabase
        .from('cultures')
        .insert(culturesData);
      
      if (culturesError) throw culturesError;
    }
    
    // Elmentjük a részletes adatokat
    if (farmData.marketPrices || farmData.blockIds) {
      const { error: detailsError } = await supabase
        .from('farm_details')
        .insert({
          farm_id: farmRecord.id,
          market_prices: farmData.marketPrices ? JSON.stringify(farmData.marketPrices) : null,
          location_data: farmData.blockIds ? JSON.stringify({ blockIds: farmData.blockIds }) : null
        });
      
      if (detailsError) throw detailsError;
    }
    
    // Rögzítjük a diagnosztikai naplóba a teljes feldolgozást
    const extractionData = {
      ...farmData,
      processedAt: new Date().toISOString(),
      year: farmData.year || new Date().getFullYear().toString()
    };
    
    await supabase
      .from('diagnostic_logs')
      .insert({
        user_id: userId,
        file_name: farmData.fileName,
        file_size: farmData.fileSize,
        extraction_data: JSON.stringify(extractionData)
      });
    
    return farmRecord.id;
  } catch (error) {
    console.error("Hiba az adatok mentése során:", error);
    throw error;
  }
};
