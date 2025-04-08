export interface Culture {
  name: string;
  hectares: number;
  estimatedRevenue?: number;
}

export interface HistoricalData {
  year: string;
  crop: string;
  yield: number;
  revenue: number;
}

export interface MarketPrice {
  culture: string;
  averageYield: number;
  price: number;
  trend: number;
  region: string;
  year: string;
  is_forecast: boolean;
  last_updated: string | Date;
}

export interface BatchInfo {
  totalBatches: number;
  processedBatches: number;
  failedBatches: number;
  totalPages: number;
  processedPages: number;
}

export interface FarmData {
  documentId?: string;
  applicantName?: string;
  submitterId?: string;
  applicantId?: string;
  totalRevenue?: number;
  hectares: number;
  cultures: Culture[];
  blockIds?: string[];
  region?: string;
  submissionDate?: string;
  year?: string;
  historicalData?: HistoricalData[];
  marketPrices?: MarketPrice[];
  batchInfo?: BatchInfo;
  ocrLogId?: string; // Add this new field to store the OCR log ID
}

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  taxId: string;
  bankAccount: string;
}
