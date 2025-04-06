
import { supabase } from "@/integrations/supabase/client";
import { HistoricalFarmData, ExtractionData } from "@/components/dashboard/historical/types";

export const fetchHistoricalData = async (userId: string): Promise<HistoricalFarmData[]> => {
  if (!userId) {
    throw new Error("User ID is required to fetch historical data");
  }
  
  try {
    // Először lekérjük a diagnosztikai logokat, hogy lássuk, milyen SAPS dokumentumok lettek feltöltve
    const { data: logs, error: logsError } = await supabase
      .from('diagnostic_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (logsError) throw logsError;
    
    // Most lekérjük a felhasználó összes farmját
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (farmsError) throw farmsError;
    
    // Minden farmhoz lekérjük a kultúrákat
    const farmData: HistoricalFarmData[] = [];
    
    if (farms && farms.length > 0) {
      for (const farm of farms) {
        const { data: cultures, error: culturesError } = await supabase
          .from('cultures')
          .select('*')
          .eq('farm_id', farm.id);
          
        if (culturesError) throw culturesError;
        
        // Történeti adat összeállítása
        const yearFromDoc = farm.document_id ? 
          farm.document_id.match(/\d{4}/) ? farm.document_id.match(/\d{4}/)[0] : "2023" : 
          "2023";
        
        const euExchangeRate = 380; // Alapértelmezett EUR/HUF árfolyam
        
        const historyEntry: HistoricalFarmData = {
          year: yearFromDoc,
          totalHectares: farm.hectares || 0,
          totalRevenue: farm.total_revenue || 0,
          totalRevenueEUR: (farm.total_revenue || 0) / euExchangeRate,
          cultures: cultures ? cultures.map(c => ({
            name: c.name,
            hectares: c.hectares || 0,
            revenue: c.estimated_revenue || 0
          })) : []
        };
        
        farmData.push(historyEntry);
      }
    }
    
    // Ha van diagnosztikai log, akkor azokból is próbálunk adatokat kinyerni
    if (logs && logs.length > 0) {
      for (const log of logs) {
        // Ne duplikáljuk az adatokat, ha már megvan a farm
        if (!log.extraction_data) continue;
        
        try {
          // Parse the extraction data if it's a string
          let extractionData: ExtractionData = {};
          
          if (typeof log.extraction_data === 'string') {
            extractionData = JSON.parse(log.extraction_data);
          } else if (typeof log.extraction_data === 'object') {
            extractionData = log.extraction_data as ExtractionData;
          } else {
            continue;
          }
          
          // Ellenőrizzük, hogy az év már szerepel-e
          const extractionYear = extractionData.year?.toString() || "2022";
          if (farmData.some(f => f.year === extractionYear)) continue;
          
          const euExchangeRate = 380; // Alapértelmezett EUR/HUF árfolyam
          
          const totalHectares = typeof extractionData.hectares === 'number' ? extractionData.hectares : 0;
          const totalRevenue = typeof extractionData.totalRevenue === 'number' ? extractionData.totalRevenue : 0;
          
          const logEntry: HistoricalFarmData = {
            year: extractionYear,
            totalHectares: totalHectares,
            totalRevenue: totalRevenue,
            totalRevenueEUR: totalRevenue / euExchangeRate,
            cultures: []
          };
          
          // Kultúrák feldolgozása, ha vannak
          if (Array.isArray(extractionData.cultures)) {
            logEntry.cultures = extractionData.cultures.map(culture => ({
              name: culture.name || "Ismeretlen",
              hectares: culture.hectares || 0,
              revenue: culture.estimatedRevenue || 0
            }));
          }
          
          // Csak akkor adjuk hozzá, ha tartalmaz értelmes adatokat
          if (logEntry.totalHectares > 0) {
            farmData.push(logEntry);
          }
        } catch (parseError) {
          console.error("Error parsing extraction data:", parseError);
          // Continue with the next log if there's an error
          continue;
        }
      }
    }
    
    // Sortirozzuk év szerint
    farmData.sort((a, b) => parseInt(b.year) - parseInt(a.year));
    
    return farmData;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    throw error;
  }
};
