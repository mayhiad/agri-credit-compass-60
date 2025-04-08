
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmData } from "@/types/farm";
import { ArrowRight, Check, FileText, User, Calendar, MapPin, Layers } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubmitterInfo from "./SubmitterInfo";
import BlocksAccordion from "./BlocksAccordion";
import CultureTable from "./CultureTable";
import HistoricalCrops from "./HistoricalCrops";

interface FarmInfoDisplayProps {
  farmData: FarmData;
  onComplete: () => void;
}

export const FarmInfoDisplay = ({ farmData, onComplete }: FarmInfoDisplayProps) => {
  const [activeTab, setActiveTab] = useState("admin");
  
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
        <CardTitle>Gazdasági adatok áttekintése</CardTitle>
        <CardDescription>
          Ellenőrizze a SAPS dokumentum alapján kinyert adatokat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="admin">
              <User className="h-4 w-4 mr-2" />
              Adminisztrációs adatok
            </TabsTrigger>
            <TabsTrigger value="blocks">
              <MapPin className="h-4 w-4 mr-2" />
              Blokkazonosítók
            </TabsTrigger>
            <TabsTrigger value="historical">
              <Calendar className="h-4 w-4 mr-2" />
              Histórikus adatok
            </TabsTrigger>
            <TabsTrigger value="current">
              <Layers className="h-4 w-4 mr-2" />
              Tárgyévi adatok
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="admin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Adminisztrációs adatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <SubmitterInfo 
                  submitterName={farmData.applicantName} 
                  submitterId={farmData.submitterId}
                  applicantId={farmData.applicantId}
                  submissionDate={farmData.submissionDate}
                  documentId={farmData.documentId}
                  documentYear={farmData.year}
                />
              </CardContent>
              <CardFooter>
                <Button onClick={() => setActiveTab("blocks")} className="w-full">
                  Jóváhagyás
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="blocks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Blokkazonosítók</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <BlocksAccordion farmData={farmData} />
              </CardContent>
              <CardFooter>
                <Button onClick={() => setActiveTab("historical")} className="w-full">
                  Jóváhagyás
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="historical" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Histórikus adatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <HistoricalCrops historicalData={farmData.historicalData || []} />
              </CardContent>
              <CardFooter>
                <Button onClick={() => setActiveTab("current")} className="w-full">
                  Jóváhagyás
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
          
          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Tárgyévi termelési adatok</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CultureTable farmData={farmData} showPrices={false} showRevenue={false} />
              </CardContent>
              <CardFooter>
                <Button onClick={onComplete} className="w-full">
                  Tovább a hitelajánlatra
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FarmInfoDisplay;
