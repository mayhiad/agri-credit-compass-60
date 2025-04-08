
export interface Culture {
  name: string;
  hectares: number;
  estimatedRevenue?: number;
  yieldPerHectare?: number;
  pricePerTon?: number;
}

export interface HistoricalCrop {
  name: string;
  hectares: number;
  yield: number;
  totalYield?: number;
  priceEUR?: number;
  revenueEUR?: number;
}

export interface HistoricalYear {
  year: string;
  totalHectares: number;
  crops: HistoricalCrop[];
  totalRevenueEUR?: number;
}

export interface HistoricalData {
  year: string;
  crop: string;
  yield: number;
  revenue: number;
}

export interface MarketPrice {
  id?: string;
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
  farmId?: string;
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
  historicalData?: HistoricalYear[];
  marketPrices?: MarketPrice[];
  batchInfo?: BatchInfo;
  ocrLogId?: string;
  fileName?: string;
  fileSize?: number;
  batchId?: string;
  pageCount?: number;
  processingStatus?: string;
  errorMessage?: string;
  rawText?: string;
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
