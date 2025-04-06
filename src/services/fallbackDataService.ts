import { FarmData } from "@/components/LoanApplication";

/**
 * Generate fallback data when document processing fails
 */
export const generateFallbackFarmData = (userId: string, fileName?: string, fileSize?: number): FarmData => {
  // Get the current year
  const currentYear = new Date().getFullYear();
  
  // Sample farm data
  const farmData: FarmData = {
    documentId: `MFP-${currentYear}-${userId.substring(0, 6)}`,
    hectares: 85.5,
    cultures: [
      {
        name: "Őszi búza",
        hectares: 30.5,
        estimatedRevenue: 12750000,
        yieldPerHectare: 5.5,
        pricePerTon: 76000
      },
      {
        name: "Kukorica",
        hectares: 25.0,
        estimatedRevenue: 14400000,
        yieldPerHectare: 8.0,
        pricePerTon: 72000
      },
      {
        name: "Napraforgó",
        hectares: 20.0,
        estimatedRevenue: 10540000,
        yieldPerHectare: 3.1,
        pricePerTon: 170000
      },
      {
        name: "Lucerna",
        hectares: 10.0,
        estimatedRevenue: 4500000,
        yieldPerHectare: 6.0,
        pricePerTon: 75000
      }
    ],
    totalRevenue: 42190000,
    region: "Hajdú-Bihar megye",
    applicantName: "Minta Gazda",
    blockIds: [`K-${userId.substring(0, 4)}`, `L-${userId.substring(4, 8)}`],
    year: currentYear.toString(),
    fileName: fileName,
    fileSize: fileSize,
    marketPrices: [
      {
        culture: "Búza",
        averageYield: 7.2,
        price: 76000,
        trend: 3,
        lastUpdated: new Date() // Use an actual Date object instead of a string
      },
      {
        culture: "Kukorica",
        averageYield: 8.5,
        price: 68000,
        trend: -2,
        lastUpdated: new Date() // Use an actual Date object instead of a string
      },
      {
        culture: "Napraforgó",
        averageYield: 3.2,
        price: 180000,
        trend: 5,
        lastUpdated: new Date() // Use an actual Date object instead of a string
      }
    ],
    parcels: [
      {
        id: `P-${userId.substring(0, 6)}-1`,
        blockId: `K-${userId.substring(0, 4)}`,
        area: 45.2,
        location: "Debrecen külterület",
        cultures: ["Őszi búza", "Kukorica"]
      },
      {
        id: `P-${userId.substring(0, 6)}-2`,
        blockId: `L-${userId.substring(4, 8)}`,
        area: 40.3,
        location: "Hajdúszoboszló külterület",
        cultures: ["Napraforgó", "Lucerna"]
      }
    ]
  };
  
  return farmData;
};

/**
 * Validate and fix farm data to ensure it has all required fields
 */
export const validateAndFixFarmData = (farmData: FarmData): FarmData => {
  if (!farmData) {
    return generateFallbackFarmData("default_user");
  }
  
  // Ensure hectares field exists and is valid
  if (!farmData.hectares || farmData.hectares <= 0) {
    farmData.hectares = 85.5;
  }
  
  // Ensure cultures array exists and has items
  if (!farmData.cultures || farmData.cultures.length === 0) {
    farmData.cultures = [
      {
        name: "Őszi búza",
        hectares: 30.5,
        estimatedRevenue: 12750000,
        yieldPerHectare: 5.5,
        pricePerTon: 76000
      },
      {
        name: "Kukorica",
        hectares: 25.0,
        estimatedRevenue: 14400000,
        yieldPerHectare: 8.0,
        pricePerTon: 72000
      }
    ];
  } else {
    // Fix any culture items that have invalid data
    farmData.cultures = farmData.cultures.map(culture => {
      if (!culture.hectares || culture.hectares <= 0) {
        culture.hectares = 10;
      }
      
      if (!culture.estimatedRevenue || culture.estimatedRevenue <= 0) {
        culture.yieldPerHectare = culture.yieldPerHectare || 5;
        culture.pricePerTon = culture.pricePerTon || 80000;
        culture.estimatedRevenue = culture.hectares * (culture.yieldPerHectare || 5) * (culture.pricePerTon || 80000);
      }
      
      return culture;
    });
  }
  
  // Ensure totalRevenue field exists and is valid
  if (!farmData.totalRevenue || farmData.totalRevenue <= 0) {
    farmData.totalRevenue = farmData.cultures.reduce((sum, culture) => 
      sum + culture.estimatedRevenue, 0);
  }
  
  // Ensure region field exists
  if (!farmData.region) {
    farmData.region = "Magyarország";
  }
  
  // Ensure blockIds array exists
  if (!farmData.blockIds || farmData.blockIds.length === 0) {
    farmData.blockIds = ["K12345", "L67890"];
  }
  
  // Ensure year field exists
  if (!farmData.year) {
    farmData.year = new Date().getFullYear().toString();
  }
  
  return farmData;
};
