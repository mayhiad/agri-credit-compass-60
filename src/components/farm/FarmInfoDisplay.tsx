
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmData } from "@/components/LoanApplication";
import { ArrowRight } from "lucide-react";
import FarmSummary from "./FarmSummary";
import CultureTable from "./CultureTable";
import BlocksAccordion from "./BlocksAccordion";
import DocumentInfo from "./DocumentInfo";

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
        <FarmSummary farmData={farmData} />
        <CultureTable farmData={farmData} />
        <BlocksAccordion farmData={farmData} />
        <DocumentInfo 
          documentId={farmData.documentId} 
          applicantName={farmData.applicantName} 
        />
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
