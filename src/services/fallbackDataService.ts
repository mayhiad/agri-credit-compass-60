
import { Culture, FarmData, HistoricalYear, MarketPrice } from "@/types/farm";

/**
 * Generate fallback farm data when AI processing fails
 */
export const generateFallbackFarmData = (userId: string, fileName?: string, fileSize?: number): FarmData => {
  // Generate a random document ID
  const documentId = `SAPS-${Math.floor(10000000 + Math.random() * 90000000)}`;
  
  // Generate random crops
  const cultures: Culture[] = [
    {
      name: "Kukorica",
      hectares: 42.8,
      yieldPerHectare: 8.2,
      pricePerTon: 75000,
      estimatedRevenue: 42.8 * 8.2 * 75000
    },
    {
      name: "Őszi búza",
      hectares: 38.5,
      yieldPerHectare: 5.5,
      pricePerTon: 85000,
      estimatedRevenue: 38.5 * 5.5 * 85000
    },
    {
      name: "Napraforgó",
      hectares: 25.3,
      yieldPerHectare: 3.2,
      pricePerTon: 160000,
      estimatedRevenue: 25.3 * 3.2 * 160000
    }
  ];
  
  // Calculate total hectares and revenue
  const totalHectares = cultures.reduce((sum, crop) => sum + crop.hectares, 0);
  const totalRevenue = cultures.reduce((sum, crop) => sum + (crop.estimatedRevenue || 0), 0);
  
  // Generate market prices
  const marketPrices: MarketPrice[] = [
    {
      id: "1",
      culture: "Kukorica",
      averageYield: 8.2,
      price: 75000,
      trend: 2,
      last_updated: new Date().toISOString(),
      region: "Magyarország",
      year: new Date().getFullYear().toString(),
      is_forecast: false
    },
    {
      id: "2",
      culture: "Őszi búza",
      averageYield: 5.5,
      price: 85000,
      trend: 1,
      last_updated: new Date().toISOString(),
      region: "Magyarország",
      year: new Date().getFullYear().toString(),
      is_forecast: false
    },
    {
      id: "3",
      culture: "Napraforgó",
      averageYield: 3.2,
      price: 160000,
      trend: -1,
      last_updated: new Date().toISOString(),
      region: "Magyarország",
      year: new Date().getFullYear().toString(),
      is_forecast: false
    }
  ];
  
  // Generate random block IDs
  const blockIds = [];
  for (let i = 0; i < 5; i++) {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const l1 = letters.charAt(Math.floor(Math.random() * letters.length));
    const l2 = letters.charAt(Math.floor(Math.random() * letters.length));
    const num = Math.floor(10000 + Math.random() * 90000);
    blockIds.push(`${l1}${l2}${num}`);
  }

  // Generate historical data
  const currentYear = new Date().getFullYear();
  const historicalData: HistoricalYear[] = [];
  
  for (let i = 5; i > 0; i--) {
    const year = (currentYear - i).toString();
    const yearData: HistoricalYear = {
      year,
      totalHectares: totalHectares * (0.9 + Math.random() * 0.2),
      crops: []
    };
    
    // Add historical crops based on current crops with some variation
    for (const crop of cultures) {
      const variationFactor = 0.8 + Math.random() * 0.4; // 80% to 120% variation
      const hectares = crop.hectares * variationFactor;
      const yieldPerHa = (crop.yieldPerHectare || 0) * (0.85 + Math.random() * 0.3);
      
      yearData.crops.push({
        name: crop.name,
        hectares,
        yield: yieldPerHa,
        totalYield: hectares * yieldPerHa,
        priceEUR: (crop.pricePerTon || 0) / 380,
        revenueEUR: (hectares * yieldPerHa * (crop.pricePerTon || 0)) / 380
      });
    }
    
    // Calculate total revenue
    yearData.totalRevenueEUR = yearData.crops.reduce((sum, crop) => sum + (crop.revenueEUR || 0), 0);
    
    historicalData.push(yearData);
  }
  
  return {
    farmId: undefined,
    applicantName: "Demo Gazdálkodó",
    submitterId: "1234567890",
    applicantId: "0987654321",
    documentId,
    region: "Bács-Kiskun",
    year: new Date().getFullYear().toString(),
    hectares: totalHectares,
    cultures,
    blockIds,
    totalRevenue,
    errorMessage: "Ez egy demo gazdaság, mivel nem sikerült kinyerni az adatokat a feltöltött dokumentumból.",
    fileName,
    fileSize,
    marketPrices,
    submissionDate: new Date().toISOString().split('T')[0],
    historicalData
  };
};

/**
 * Validate and fix missing fields in farm data
 */
export const validateAndFixFarmData = (farmData: FarmData): FarmData => {
  // Make a deep copy to avoid mutating the original
  const validatedData = JSON.parse(JSON.stringify(farmData)) as FarmData;
  
  // Make sure hectares is valid
  if (!validatedData.hectares || isNaN(validatedData.hectares) || validatedData.hectares <= 0) {
    validatedData.hectares = validatedData.cultures?.reduce((sum, c) => sum + (c.hectares || 0), 0) || 0;
    
    // If still invalid, set a default
    if (!validatedData.hectares || validatedData.hectares <= 0) {
      validatedData.hectares = 100;
    }
  }
  
  // Make sure cultures is an array
  if (!validatedData.cultures || !Array.isArray(validatedData.cultures)) {
    validatedData.cultures = [];
  }
  
  // Validate each culture
  validatedData.cultures = validatedData.cultures.map(culture => {
    // Ensure the culture has a name
    if (!culture.name) {
      culture.name = "Ismeretlen növénykultúra";
    }
    
    // Ensure hectares is valid
    if (!culture.hectares || isNaN(culture.hectares) || culture.hectares <= 0) {
      culture.hectares = validatedData.hectares * 0.1; // 10% of total as fallback
    }
    
    // Add yield, price and revenue if missing
    if (!culture.yieldPerHectare || culture.yieldPerHectare <= 0) {
      // Default yields based on crop type
      const yields: Record<string, number> = {
        'Kukorica': 8.2,
        'Búza': 5.5,
        'Őszi búza': 5.5,
        'Napraforgó': 3.2,
        'Árpa': 5.0,
        'Őszi árpa': 5.0,
        'Tavaszi árpa': 4.8,
        'Repce': 3.2,
        'Szója': 2.8,
        'Cukorrépa': 60.0,
        'Lucerna': 8.0
      };
      
      // Find a closest match or use default
      const cropName = culture.name.toLowerCase();
      let matchedYield = 4.5; // default
      
      for (const [key, value] of Object.entries(yields)) {
        if (cropName.includes(key.toLowerCase())) {
          matchedYield = value;
          break;
        }
      }
      
      culture.yieldPerHectare = matchedYield;
    }
    
    if (!culture.pricePerTon || culture.pricePerTon <= 0) {
      // Default prices based on crop type
      const prices: Record<string, number> = {
        'Kukorica': 75000,
        'Búza': 85000,
        'Őszi búza': 85000,
        'Napraforgó': 160000,
        'Árpa': 78000,
        'Őszi árpa': 78000,
        'Tavaszi árpa': 75000,
        'Repce': 170000,
        'Szója': 150000,
        'Cukorrépa': 12000,
        'Lucerna': 25000
      };
      
      // Find a closest match or use default
      const cropName = culture.name.toLowerCase();
      let matchedPrice = 80000; // default
      
      for (const [key, value] of Object.entries(prices)) {
        if (cropName.includes(key.toLowerCase())) {
          matchedPrice = value;
          break;
        }
      }
      
      culture.pricePerTon = matchedPrice;
    }
    
    // Calculate estimated revenue if missing
    if (!culture.estimatedRevenue || culture.estimatedRevenue <= 0) {
      culture.estimatedRevenue = culture.hectares * culture.yieldPerHectare * culture.pricePerTon;
    }
    
    return culture;
  });
  
  // Calculate total revenue if missing
  if (!validatedData.totalRevenue || validatedData.totalRevenue <= 0) {
    validatedData.totalRevenue = validatedData.cultures.reduce(
      (sum, culture) => sum + (culture.estimatedRevenue || 0), 
      0
    );
  }
  
  // Ensure year is set
  if (!validatedData.year) {
    validatedData.year = new Date().getFullYear().toString();
  }
  
  return validatedData;
};
