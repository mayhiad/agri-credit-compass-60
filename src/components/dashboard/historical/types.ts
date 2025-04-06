
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
}

export interface MarketPrice {
  culture: string;
  averageYield: number; // t/ha
  price: number; // Ft/t
  trend: number; // -1: csökkenő, 0: stabil, 1: növekvő
  lastUpdated?: string;
  year?: string;
}
