
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Calendar, Clock } from "lucide-react";

interface DocumentInfoProps {
  documentId?: string;
  submissionDate?: string;
  year?: string;
}

const DocumentInfo: React.FC<DocumentInfoProps> = ({ 
  documentId = "N/A", 
  submissionDate = "N/A",
  year = "N/A"
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Dokumentum adatok
        </CardTitle>
        <CardDescription>
          Az egységes kérelem és a feltöltött dokumentum adatai
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Iratazonosító</p>
            <p className="font-semibold">{documentId}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Egységes kérelem beadásának időpontja</p>
            <p className="font-semibold flex items-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              {submissionDate}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Meghatározott tárgyév</p>
            <p className="font-semibold flex items-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {year}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DocumentInfo;
