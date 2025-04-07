
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { ProcessingStatus } from "@/types/processing";
import { FileText, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessingStatusProps {
  status: ProcessingStatus | null;
}

const ProcessingStatusIndicator = ({ status }: ProcessingStatusProps) => {
  if (!status) return null;

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium">{status.step}</span>
        <span className="text-sm text-muted-foreground">{status.progress}%</span>
      </div>
      
      <Progress value={status.progress} className="h-2" />
      
      {status.details && (
        <p className="text-sm text-muted-foreground mt-1">{status.details}</p>
      )}
      
      {status.batchProgress && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-100 rounded-md">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-blue-700">
              Kötegelt feldolgozás: {status.batchProgress.currentBatch}/{status.batchProgress.totalBatches} köteg
            </span>
          </div>
          <Progress 
            value={(status.batchProgress.pagesProcessed / status.batchProgress.totalPages) * 100} 
            className="h-1.5 mt-1 mb-1"
          />
          <p className="text-xs text-blue-600">
            {status.batchProgress.pagesProcessed}/{status.batchProgress.totalPages} oldal feldolgozva
          </p>
        </div>
      )}
      
      {status.wordDocumentUrl && status.progress === 100 && (
        <div className="flex items-center gap-2 mt-2 bg-green-50 p-2 rounded border border-green-200">
          <FileText className="h-4 w-4 text-green-600" />
          <span className="text-sm text-green-800 flex-1">OCR eredmény Word dokumentum</span>
          <Button variant="outline" size="sm" className="bg-white" asChild>
            <a href={status.wordDocumentUrl} target="_blank" rel="noopener noreferrer">
              Letöltés
            </a>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProcessingStatusIndicator;
