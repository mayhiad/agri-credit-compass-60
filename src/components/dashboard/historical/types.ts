
export interface HistoricalFarmData {
  year: string;
  totalHectares: number;
  totalRevenue: number;
  totalRevenueEUR: number;
  cultures: {
    name: string;
    hectares: number;
    revenue: number;
    pricePerTon?: number;
    yieldPerHectare?: number;
  }[];
}

export interface ExtractionData {
  year?: string;
  hectares?: number;
  totalRevenue?: number;
  cultures?: Array<{
    name: string;
    hectares: number;
    estimatedRevenue: number;
    yieldPerHectare?: number;
    pricePerTon?: number;
  }>;
  region?: string;
  documentId?: string;
  applicantName?: string;
  blockIds?: string[];
  marketPrices?: Array<{
    culture: string;
    averageYield: number;
    price: number;
    trend: number;
    lastUpdated?: string;
  }>;
  processedAt?: string;
  fileName?: string;
  fileSize?: number;
  errorMessage?: string; // Javítás: Hiba üzenetet tárol hibás feldolgozás esetén
}

export interface MarketPrice {
  culture: string;
  averageYield: number; // t/ha
  price: number; // Ft/t
  trend: number; // -1: decreasing, 0: stable, 1: increasing
  lastUpdated?: string;
  year?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

// To check if the data extracted from the document is valid
export function validateExtractionData(data: ExtractionData): ValidationResult {
  const errors: string[] = [];
  
  // Check basic data
  if (!data.hectares || data.hectares <= 0) {
    errors.push("Missing or invalid area data (hectares)");
  }
  
  if (!data.cultures || data.cultures.length === 0) {
    errors.push("No crops found in the document");
  } else {
    // Check crop data
    for (const culture of data.cultures) {
      if (!culture.name) {
        errors.push("Missing crop name");
      }
      
      if (!culture.hectares || culture.hectares <= 0) {
        errors.push(`Missing or invalid area data for crop ${culture.name || 'unknown'}`);
      }
      
      if (!culture.estimatedRevenue || culture.estimatedRevenue <= 0) {
        errors.push(`Missing or invalid estimated revenue for crop ${culture.name || 'unknown'}`);
      }
    }
  }
  
  if (!data.totalRevenue || data.totalRevenue <= 0) {
    errors.push("Missing or invalid total revenue");
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? 
      "Not all necessary data could be extracted from the document" : 
      "Data successfully extracted",
    errors: errors.length > 0 ? errors : undefined
  };
}
