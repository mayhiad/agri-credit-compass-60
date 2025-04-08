
import { CheckCircle, Calendar } from "lucide-react";

interface DocumentInfoProps {
  documentId?: string;
  applicantName?: string;
  documentDate?: string;
}

export const DocumentInfo = ({ documentId, applicantName, documentDate }: DocumentInfoProps) => {
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
      {documentDate && (
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-blue-600" />
          <span>Dokumentum dátuma: <span className="font-medium">{documentDate}</span></span>
        </div>
      )}
    </div>
  );
};

export default DocumentInfo;
