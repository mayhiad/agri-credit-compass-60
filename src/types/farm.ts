
// Common types used across the farm and loan application components

export interface Culture {
  name: string;
  hectares: number;
  yieldPerHectare?: number;
  pricePerTon?: number;
  estimatedRevenue?: number;
}

export interface MarketPrice {
  id: string;
  culture: string;
  averageYield: number;
  price: number;
  trend: number;
  last_updated: string | Date;
  region: string;
  year: string;
  is_forecast: boolean;
}

export interface HistoricalCrop {
  name: string;
  hectares: number;
  yield: number;
  totalYield: number;
  priceEUR?: number;
  revenueEUR?: number;
}

export interface HistoricalYear {
  year: string;
  totalHectares: number;
  crops: HistoricalCrop[];
  totalRevenueEUR?: number;
}

export interface FarmData {
  farmId?: string;
  fileName?: string;
  fileSize?: number;
  applicantName?: string;
  documentId?: string;
  region?: string;
  year?: string;
  hectares: number;
  cultures: Culture[];
  blockIds?: string[];
  totalRevenue: number;
  errorMessage?: string;
  ocrText?: string;
  wordDocumentUrl?: string;
  submitterId?: string;
  applicantId?: string;
  rawText?: string;
  marketPrices?: MarketPrice[];
  documentDate?: string;
  parcels?: any[];
  batchId?: string;  // Added for batch processing
  pageCount?: number; // Added to track document pages
  processingStatus?: string; // Added to track processing status
  submissionDate?: string; // Added for document submission date
  historicalData?: HistoricalYear[]; // Added for historical crop data
}

export interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
}

export interface BatchProcessingInfo {
  batchId: string;
  pageCount: number;
  currentBatch: number;
  totalBatches: number;
  processedPages: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}
