
import React from "react";
import { FileWarning } from "lucide-react";

interface ErrorDisplayProps {
  message: string | null;
}

export const ErrorDisplay = ({ message }: ErrorDisplayProps) => {
  if (!message) return null;

  return (
    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-start">
      <FileWarning className="h-5 w-5 mr-2 flex-shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
};

export default ErrorDisplay;
