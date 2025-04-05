
import React from "react";

interface ProcessingStatusProps {
  status: {
    step: string;
    progress: number;
    details?: string;
  } | null;
}

export const ProcessingStatus = ({ status }: ProcessingStatusProps) => {
  if (!status) return null;

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs mb-1">
        <span>{status.step}</span>
        <span>{status.progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
          style={{ width: `${status.progress}%` }}
        />
      </div>
      {status.details && (
        <p className="text-xs text-muted-foreground mt-2">{status.details}</p>
      )}
    </div>
  );
};

export default ProcessingStatus;
