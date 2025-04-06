
export interface HistoricalFarmData {
  year: string;
  totalHectares: number;
  totalRevenue: number;
  totalRevenueEUR: number;
  cultures: {
    name: string;
    hectares: number;
    revenue: number;
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
  }>;
  region?: string;
  documentId?: string;
  applicantName?: string;
  blockIds?: string[];
  marketPrices?: any[];
  processedAt?: string;
}
