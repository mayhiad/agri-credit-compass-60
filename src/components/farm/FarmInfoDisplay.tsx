
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmData } from "@/types/farm";
import { ArrowRight, Check, FileText, User, Calendar, MapPin, Layers, RotateCcw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SubmitterInfo from "./SubmitterInfo";
import BlocksAccordion from "./BlocksAccordion";
import CultureTable from "./CultureTable";
import HistoricalCrops from "./HistoricalCrops";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface FarmInfoDisplayProps {
  farmData: FarmData;
  onComplete: () => void;
  onBackToDashboard?: () => void;
}

export const FarmInfoDisplay = ({ farmData, onComplete, onBackToDashboard }: FarmInfoDisplayProps) => {
  const [activeTab, setActiveTab] = useState("admin");
  
  // Check if we have meaningful data or mostly N/A values
  const hasIncompleteData = !farmData?.applicantName && 
                          !farmData?.submitterId && 
                          !farmData?.applicantId && 
                          !farmData?.documentId;
  
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
        <CardFooter className="flex justify-between">
          {onBackToDashboard && (
            <Button variant="outline" onClick={onBackToDashboard}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Vissza az irányítópultra
            </Button>
          )}
          <Button onClick={onComplete} className="ml-auto">
            Folytatás
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
        {hasIncompleteData && (
          <Alert variant="warning" className="bg-amber-50 border-amber-200 mb-4">
            <AlertTitle className="text-amber-800">Hiányos adatok</AlertTitle>
            <AlertDescription className="text-amber-700">
              A dokumentumból nem sikerült minden fontos adatot kiolvasni. Ellenőrizze az adatokat, vagy próbálkozzon egy másik dokumentum feltöltésével.
            </AlertDescription>
          </Alert>
        )}
        
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
              <CardFooter className="flex justify-between">
                {onBackToDashboard && hasIncompleteData && (
                  <Button variant="outline" onClick={onBackToDashboard}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Vissza az irányítópultra
                  </Button>
                )}
                <Button onClick={() => setActiveTab("blocks")} className={hasIncompleteData ? "ml-auto" : "w-full"}>
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
                {(!farmData.blockIds || farmData.blockIds.length === 0) && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800">
                      A dokumentumból nem sikerült blokkazonosítókat kiolvasni. 
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {onBackToDashboard && hasIncompleteData && (
                  <Button variant="outline" onClick={onBackToDashboard}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Vissza az irányítópultra
                  </Button>
                )}
                <Button onClick={() => setActiveTab("historical")} className={hasIncompleteData ? "ml-auto" : "w-full"}>
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
                {(!farmData.historicalData || farmData.historicalData.length === 0) && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800">
                      A dokumentumból nem sikerült historikus adatokat kiolvasni.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {onBackToDashboard && hasIncompleteData && (
                  <Button variant="outline" onClick={onBackToDashboard}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Vissza az irányítópultra
                  </Button>
                )}
                <Button onClick={() => setActiveTab("current")} className={hasIncompleteData ? "ml-auto" : "w-full"}>
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
                {(!farmData.cultures || farmData.cultures.length === 0) && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertDescription className="text-amber-800">
                      A dokumentumból nem sikerült tárgyévi termelési adatokat kiolvasni.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                {onBackToDashboard && hasIncompleteData && (
                  <Button variant="outline" onClick={onBackToDashboard}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Vissza az irányítópultra
                  </Button>
                )}
                <Button onClick={onComplete} className={hasIncompleteData ? "ml-auto" : "w-full"}>
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
