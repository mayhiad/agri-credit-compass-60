
/**
 * Type definitions for document processing
 */

export type ProcessingStatus = {
  step: string;
  progress: number;
  details?: string;
  wordDocumentUrl?: string;
  claudeResponseUrl?: string;
  rawClaudeResponse?: string;
  claudeResponseTimestamp?: string;
  processingId?: string;
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    pagesProcessed: number;
    totalPages: number;
  };
};
