
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { ProcessingStatus } from "@/types/processing";
import { FileText, Layers, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProcessingStatusProps {
  status: ProcessingStatus | null;
}

const ProcessingStatusIndicator = ({ status }: ProcessingStatusProps) => {
  if (!status) return null;

  // Helper function to get the appropriate icon and color based on progress
  const getStatusIndicator = (progress: number) => {
    if (progress === 100) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    if (progress < 20) return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
    return <Clock className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {getStatusIndicator(status.progress)}
          <span className="text-sm font-medium">{status.step}</span>
        </div>
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
          <div className="flex justify-between text-xs text-blue-600">
            <span>{status.batchProgress.pagesProcessed}/{status.batchProgress.totalPages} oldal feldolgozva</span>
            <span>{Math.round((status.batchProgress.pagesProcessed / status.batchProgress.totalPages) * 100)}%</span>
          </div>
          
          {/* Detailed processing steps */}
          <div className="mt-2 space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${status.progress >= 10 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={status.progress >= 10 ? 'text-green-700' : 'text-gray-500'}>
                Dokumentum validálása
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${status.progress >= 20 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={status.progress >= 20 ? 'text-green-700' : 'text-gray-500'}>
                PDF képekké konvertálása
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${status.progress >= 40 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={status.progress >= 40 ? 'text-green-700' : 'text-gray-500'}>
                Claude AI képelemzés
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${status.progress >= 70 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={status.progress >= 70 ? 'text-green-700' : 'text-gray-500'}>
                Adatok strukturálása
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${status.progress >= 90 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={status.progress >= 90 ? 'text-green-700' : 'text-gray-500'}>
                Adatok mentése adatbázisba
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={`h-2 w-2 rounded-full ${status.progress >= 100 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span className={status.progress >= 100 ? 'text-green-700' : 'text-gray-500'}>
                Feldolgozás befejezve
              </span>
            </div>
          </div>
          
          {/* Any potential blockers or warnings */}
          {status.progress > 0 && status.progress < 100 && status.progress === status.lastProgress && (
            <div className="mt-2 flex items-start gap-2 p-1.5 bg-amber-50 border border-amber-200 rounded text-xs">
              <AlertCircle className="h-3.5 w-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-amber-700">
                A feldolgozás ennél a lépésnél hosszabb időt vehet igénybe, különösen nagyméretű dokumentumok esetén. Kérjük, legyen türelemmel.
              </span>
            </div>
          )}
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
