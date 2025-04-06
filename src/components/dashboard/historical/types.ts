
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
  error?: string; // Hibaüzenet, ha a feldolgozás sikertelen
}

export interface MarketPrice {
  culture: string;
  averageYield: number; // t/ha
  price: number; // Ft/t
  trend: number; // -1: csökkenő, 0: stabil, 1: növekvő
  lastUpdated?: string;
  year?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

// Annak ellenőrzésére, hogy a dokumentumból kinyert adatok érvényesek-e
export function validateExtractionData(data: ExtractionData): ValidationResult {
  const errors: string[] = [];
  
  // Alapadatok ellenőrzése
  if (!data.hectares || data.hectares <= 0) {
    errors.push("Hiányzó vagy érvénytelen területadat (hektár)");
  }
  
  if (!data.cultures || data.cultures.length === 0) {
    errors.push("Nem található növénykultúra a dokumentumban");
  } else {
    // Kultúrák adatainak ellenőrzése
    for (const culture of data.cultures) {
      if (!culture.name) {
        errors.push("Hiányzó növénykultúra név");
      }
      
      if (!culture.hectares || culture.hectares <= 0) {
        errors.push(`Hiányzó vagy érvénytelen területadat a(z) ${culture.name || 'ismeretlen'} kultúránál`);
      }
      
      if (!culture.estimatedRevenue || culture.estimatedRevenue <= 0) {
        errors.push(`Hiányzó vagy érvénytelen becsült bevétel a(z) ${culture.name || 'ismeretlen'} kultúránál`);
      }
    }
  }
  
  if (!data.totalRevenue || data.totalRevenue <= 0) {
    errors.push("Hiányzó vagy érvénytelen teljes árbevétel");
  }
  
  return {
    valid: errors.length === 0,
    message: errors.length > 0 ? 
      "A dokumentumból nem sikerült minden szükséges adatot kinyerni" : 
      "Az adatok sikeresen kinyerve",
    errors: errors.length > 0 ? errors : undefined
  };
}
