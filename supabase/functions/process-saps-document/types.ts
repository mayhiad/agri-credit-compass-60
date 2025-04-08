
// Type definitions for Claude API and document processing

export interface FarmData {
  applicantName?: string;
  submitterId?: string;
  applicantId?: string;
  documentId?: string;
  submissionDate?: string;
  year?: string;
  region?: string;
  hectares: number;
  cultures: Culture[];
  blockIds?: string[];
  historicalData?: HistoricalYear[];
  totalRevenue: number;
  rawText?: string;
  dataUnavailable?: boolean;
  errorMessage?: string;
}

export interface Culture {
  name: string;
  hectares: number;
  estimatedRevenue: number;
}

export interface HistoricalCrop {
  name: string;
  hectares: number;
  yield: number;
  totalYield: number;
}

export interface HistoricalYear {
  year: string;
  totalHectares: number;
  crops: HistoricalCrop[];
}

export interface ClaudeResponse {
  content: {
    text: string;
    type: string;
  }[];
}
