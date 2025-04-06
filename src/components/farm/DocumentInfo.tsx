
import { CheckCircle } from "lucide-react";

interface DocumentInfoProps {
  documentId?: string;
  applicantName?: string;
}

export const DocumentInfo = ({ documentId, applicantName }: DocumentInfoProps) => {
  return (
    <div className="bg-muted p-4 rounded-md space-y-2">
      <div className="flex items-center space-x-2">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span>SAPS dokumentum azonosító: <span className="font-medium">{documentId || "Ismeretlen"}</span></span>
      </div>
      {applicantName && (
        <div className="flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Igénylő neve: <span className="font-medium">{applicantName}</span></span>
        </div>
      )}
    </div>
  );
};

export default DocumentInfo;
