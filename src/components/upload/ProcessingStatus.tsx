
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
        <p className="text-xs text-muted-foreground mt-2">
          {status.details}
          {status.progress > 40 && status.progress < 90 && 
            <span className="block text-amber-600 mt-1">
              A feldolgozás időtartama a dokumentum méretétől függően akár 3-5 perc is lehet.
              Kérjük, ne zárja be az ablakot és ne töltse újra az oldalt a feldolgozás alatt!
            </span>
          }
        </p>
      )}
    </div>
  );
};

export default ProcessingStatus;
