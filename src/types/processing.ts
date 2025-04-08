
/**
 * Type definitions for document processing
 */

export type ProcessingStatus = {
  step: string;
  progress: number;
  details?: string;
  wordDocumentUrl?: string;
  lastProgress?: number; // To detect if progress is stuck
  batchProgress?: {
    currentBatch: number;
    totalBatches: number;
    pagesProcessed: number;
    totalPages: number;
  };
};
