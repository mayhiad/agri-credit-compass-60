
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmData } from "@/types/farm";
import { ArrowRight } from "lucide-react";
import FarmSummary from "./FarmSummary";
import CultureTable from "./CultureTable";
import BlocksAccordion from "./BlocksAccordion";
import DocumentInfo from "./DocumentInfo";
import SubmitterInfo from "./SubmitterInfo";

interface FarmInfoDisplayProps {
  farmData: FarmData;
  onComplete: () => void;
}

export const FarmInfoDisplay = ({ farmData, onComplete }: FarmInfoDisplayProps) => {
  // Make sure farmData is properly defined before rendering
  if (!farmData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gazdasági adatok</CardTitle>
          <CardDescription>
            Hiányzó vagy hibás gazdasági adatok
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <p>Nem található érvényes gazdasági adat.</p>
            <p className="text-sm mt-2">Kérjük, töltse fel újra a SAPS dokumentumot.</p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onComplete} className="w-full">
            Vissza
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gazdasági adatok</CardTitle>
        <CardDescription>
          Ellenőrizze a SAPS dokumentum alapján kinyert adatokat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <SubmitterInfo 
          submitterName={farmData.applicantName || "N/A"} 
          submitterId={farmData.submitterId || "N/A"}
          applicantId={farmData.applicantId || "N/A"}
          submissionDate={farmData.submissionDate || farmData.documentDate || "N/A"}
        />
        <FarmSummary farmData={farmData} />
        <CultureTable farmData={farmData} />
        <BlocksAccordion farmData={farmData} />
        <DocumentInfo 
          documentId={farmData.documentId || "N/A"} 
          applicantName={farmData.applicantName || "N/A"} 
          documentDate={farmData.documentDate || farmData.submissionDate || farmData.year || "N/A"}
        />
        
        {farmData.processingId && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800">Feldolgozási azonosító: {farmData.processingId}</p>
            {farmData.claudeResponseUrl && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-blue-600">Claude AI válasz</span>
                <Button variant="outline" size="sm" asChild>
                  <a href={farmData.claudeResponseUrl} target="_blank" rel="noopener noreferrer">
                    Megtekintés
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={onComplete} className="w-full">
          Adatok megerősítése
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FarmInfoDisplay;
