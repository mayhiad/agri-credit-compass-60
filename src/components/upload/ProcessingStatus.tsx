
import React from 'react';
import { Progress } from "@/components/ui/progress";
import { ProcessingStatus } from "@/services/uploadProcessingService";
import { FileText } from "lucide-react";
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
