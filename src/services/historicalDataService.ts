
import { supabase } from "@/integrations/supabase/client";
import { HistoricalFarmData, ExtractionData, MarketPrice } from "@/components/dashboard/historical/types";

// Alapértelmezett piaci árak, ha nem találnánk a adatbázisban
const DEFAULT_MARKET_PRICES: MarketPrice[] = [
  { culture: "Őszi búza", averageYield: 5.5, price: 85000, trend: 0, year: "2023" },
  { culture: "Búza", averageYield: 5.5, price: 85000, trend: 0, year: "2023" },
  { culture: "Kukorica", averageYield: 8.0, price: 72000, trend: 1, year: "2023" },
  { culture: "Napraforgó", averageYield: 3.1, price: 170000, trend: 0, year: "2023" },
  { culture: "Őszi káposztarepce", averageYield: 3.3, price: 190000, trend: 1, year: "2023" },
  { culture: "Repce", averageYield: 3.3, price: 190000, trend: 1, year: "2023" },
  { culture: "Őszi árpa", averageYield: 5.2, price: 70000, trend: -1, year: "2023" },
  { culture: "Tavaszi árpa", averageYield: 4.8, price: 73000, trend: 0, year: "2023" },
  { culture: "Árpa", averageYield: 5.0, price: 71000, trend: -1, year: "2023" },
  { culture: "Szója", averageYield: 2.8, price: 210000, trend: 1, year: "2023" },
  { culture: "Lucerna", averageYield: 6.0, price: 45000, trend: 0, year: "2023" },
  { culture: "Cukorrépa", averageYield: 60.0, price: 15000, trend: 1, year: "2023" },
  { culture: "Burgonya", averageYield: 35.0, price: 50000, trend: 0, year: "2023" }
];

// Piaci árak lekérése az adatbázisból
const fetchMarketPrices = async (): Promise<MarketPrice[]> => {
  try {
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .order('last_updated', { ascending: false });
      
    if (error) {
      console.error("Hiba a piaci árak lekérésekor:", error);
      return DEFAULT_MARKET_PRICES;
    }
    
    if (data && data.length > 0) {
      return data.map(item => ({
        culture: item.culture,
        averageYield: item.average_yield,
        price: item.price,
        trend: item.trend,
        lastUpdated: item.last_updated,
        year: item.year
      }));
    }
    
    return DEFAULT_MARKET_PRICES;
  } catch (error) {
    console.error("Nem sikerült lekérni a piaci árakat:", error);
    return DEFAULT_MARKET_PRICES;
  }
};

// Megtalálja a legjobban illeszkedő piaci árat egy adott kultúrához
const findBestMatchingPrice = (cultureName: string, year: string, marketPrices: MarketPrice[]): MarketPrice | null => {
  // Először keresünk pontos egyezést az adott évre
  const exactMatch = marketPrices.find(
    price => price.culture.toLowerCase() === cultureName.toLowerCase() && price.year === year
  );
  if (exactMatch) return exactMatch;
  
  // Ha nincs pontos egyezés az adott évre, keresünk évszám nélkül
  const nameMatch = marketPrices.find(
    price => price.culture.toLowerCase() === cultureName.toLowerCase()
  );
  if (nameMatch) return nameMatch;
  
  // Ha továbbra sincs egyezés, keresünk részleges név egyezést
  const partialMatch = marketPrices.find(
    price => cultureName.toLowerCase().includes(price.culture.toLowerCase()) || 
             price.culture.toLowerCase().includes(cultureName.toLowerCase())
  );
  if (partialMatch) return partialMatch;
  
  // Ha nincs egyezés, visszaadunk egy alapértelmezett árat
  return { 
    culture: cultureName, 
    averageYield: 4.5, 
    price: 100000, 
    trend: 0,
    year: year 
  };
};

export const fetchHistoricalData = async (userId: string): Promise<HistoricalFarmData[]> => {
  if (!userId) {
    throw new Error("User ID is required to fetch historical data");
  }
  
  try {
    console.log("Histórikus adatok lekérése a következő userId-hez:", userId);
    
    // Piaci árak lekérése
    const marketPrices = await fetchMarketPrices();
    console.log("Piaci árak betöltve:", marketPrices.length);
    
    // Először lekérjük a diagnosztikai logokat, hogy lássuk, milyen SAPS dokumentumok lettek feltöltve
    const { data: logs, error: logsError } = await supabase
      .from('diagnostic_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (logsError) throw logsError;
    
    console.log("Diagnosztikai logok lekérve:", logs?.length || 0);
    
    // Most lekérjük a felhasználó összes farmját
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (farmsError) throw farmsError;
    
    console.log("Farmok lekérve:", farms?.length || 0);
    
    // Minden farmhoz lekérjük a kultúrákat
    const farmData: HistoricalFarmData[] = [];
    
    if (farms && farms.length > 0) {
      for (const farm of farms) {
        const { data: cultures, error: culturesError } = await supabase
          .from('cultures')
          .select('*')
          .eq('farm_id', farm.id);
          
        if (culturesError) throw culturesError;
        
        console.log(`Farm ${farm.id} kultúráinak száma:`, cultures?.length || 0);
        
        // Történeti adat összeállítása
        const yearFromDoc = farm.document_id ? 
          farm.document_id.match(/\d{4}/) ? farm.document_id.match(/\d{4}/)[0] : "2023" : 
          "2023";
        
        const euExchangeRate = 380; // Alapértelmezett EUR/HUF árfolyam
        
        const cultureData = cultures ? cultures.map(c => {
          const matchedPrice = findBestMatchingPrice(c.name, yearFromDoc, marketPrices);
          const yieldPerHectare = matchedPrice ? matchedPrice.averageYield : 4.5;
          const pricePerTon = matchedPrice ? matchedPrice.price : 100000;
          
          // Kiszámoljuk a bevételt a termésátlag és az ár alapján, ha az estimatedRevenue nem áll rendelkezésre
          const revenue = c.estimated_revenue || (c.hectares * yieldPerHectare * pricePerTon);
          
          return {
            name: c.name,
            hectares: c.hectares || 0,
            revenue: revenue,
            yieldPerHectare: yieldPerHectare,
            pricePerTon: pricePerTon
          };
        }) : [];
        
        // Teljes bevétel újraszámolása a pontos adatok alapján
        const totalRevenue = cultureData.reduce((sum, c) => sum + c.revenue, 0);
        
        const historyEntry: HistoricalFarmData = {
          year: yearFromDoc,
          totalHectares: farm.hectares || 0,
          totalRevenue: totalRevenue,
          totalRevenueEUR: totalRevenue / euExchangeRate,
          cultures: cultureData
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
          
          // Kultúrák feldolgozása, ha vannak
          const cultureData = Array.isArray(extractionData.cultures) ? 
            extractionData.cultures.map(culture => {
              const name = culture.name || "Ismeretlen";
              const hectares = culture.hectares || 0;
              
              const matchedPrice = findBestMatchingPrice(name, extractionYear, marketPrices);
              const yieldPerHectare = matchedPrice ? matchedPrice.averageYield : 4.5;
              const pricePerTon = matchedPrice ? matchedPrice.price : 100000;
              
              // Kiszámoljuk a bevételt a termésátlag és az ár alapján, ha az estimatedRevenue nem áll rendelkezésre
              const revenue = culture.estimatedRevenue || (hectares * yieldPerHectare * pricePerTon);
              
              return {
                name,
                hectares,
                revenue,
                yieldPerHectare,
                pricePerTon
              };
            }) : [];
            
          // Teljes bevétel újraszámolása a pontos adatok alapján
          const totalRevenue = cultureData.reduce((sum, c) => sum + c.revenue, 0);
          
          const logEntry: HistoricalFarmData = {
            year: extractionYear,
            totalHectares: totalHectares,
            totalRevenue: totalRevenue,
            totalRevenueEUR: totalRevenue / euExchangeRate,
            cultures: cultureData
          };
          
          // Csak akkor adjuk hozzá, ha tartalmaz értelmes adatokat
          if (logEntry.totalHectares > 0 || (logEntry.cultures && logEntry.cultures.length > 0)) {
            farmData.push(logEntry);
          }
        } catch (parseError) {
          console.error("Error parsing extraction data:", parseError);
          // Continue with the next log if there's an error
          continue;
        }
      }
    }
    
    // Ha egyáltalán nincsenek adatok, hozzáadunk néhány tesztadatot
    if (farmData.length === 0) {
      // Teszt adatok ha nincs semmi
      farmData.push({
        year: "2022",
        totalHectares: 350.5,
        totalRevenue: 120000000,
        totalRevenueEUR: 315789,
        cultures: [
          { name: "Búza", hectares: 150.5, revenue: 70000000, yieldPerHectare: 5.5, pricePerTon: 85000 },
          { name: "Kukorica", hectares: 120, revenue: 40000000, yieldPerHectare: 7.8, pricePerTon: 72000 },
          { name: "Napraforgó", hectares: 80, revenue: 10000000, yieldPerHectare: 3.0, pricePerTon: 170000 }
        ]
      });
      
      farmData.push({
        year: "2021",
        totalHectares: 320.8,
        totalRevenue: 105000000,
        totalRevenueEUR: 276315,
        cultures: [
          { name: "Búza", hectares: 140.3, revenue: 60000000, yieldPerHectare: 5.2, pricePerTon: 82000 },
          { name: "Kukorica", hectares: 110.5, revenue: 35000000, yieldPerHectare: 7.5, pricePerTon: 70000 },
          { name: "Napraforgó", hectares: 70, revenue: 10000000, yieldPerHectare: 2.8, pricePerTon: 165000 }
        ]
      });
    }
    
    // Sortirozzuk év szerint
    farmData.sort((a, b) => parseInt(b.year) - parseInt(a.year));
    
    console.log("Összesen lekért történeti adatok:", farmData.length);
    return farmData;
  } catch (error) {
    console.error("Error fetching historical data:", error);
    throw error;
  }
};
