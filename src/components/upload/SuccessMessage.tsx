
import React from "react";
import { FileCheck } from "lucide-react";

interface SuccessMessageProps {
  status: {
    step: string;
    progress: number;
    details?: string;
  } | null;
}

export const SuccessMessage = ({ status }: SuccessMessageProps) => {
  if (!status || status.progress !== 100) return null;

  return (
    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 flex items-start">
      <FileCheck className="h-5 w-5 mr-2 flex-shrink-0" />
      <div>
        <p className="text-sm font-medium">Dokumentum sikeresen feldolgozva</p>
        <p className="text-xs mt-1">{status.details}</p>
      </div>
    </div>
  );
};

export default SuccessMessage;
