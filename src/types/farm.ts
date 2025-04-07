
// Common types used across the farm and loan application components

export interface Culture {
  name: string;
  hectares: number;
  yieldPerHectare?: number;
  pricePerTon?: number;
  estimatedRevenue?: number;
}

export interface MarketPrice {
  culture: string;
  averageYield: number;
  price: number;
  trend: number;
  lastUpdated: string | Date;
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
}

export interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
}
