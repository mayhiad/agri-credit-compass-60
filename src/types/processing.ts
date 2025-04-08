
/**
 * Type definitions for document processing
 */

export type ProcessingStatus = {
  step: string;
  progress: number;
  details?: string;
  wordDocumentUrl?: string;
  rawClaudeResponse?: string;
  claudeResponseTimestamp?: string;
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    pagesProcessed: number;
    totalPages: number;
  };
};
