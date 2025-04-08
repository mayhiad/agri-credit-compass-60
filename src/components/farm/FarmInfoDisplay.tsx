
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FarmData } from "@/types/farm";
import FarmSummary from "@/components/farm/FarmSummary";
import DocumentInfo from "@/components/farm/DocumentInfo";
import SubmitterInfo from "@/components/farm/SubmitterInfo";
import CultureTable from "@/components/farm/CultureTable";
import BlocksAccordion from "@/components/farm/BlocksAccordion";
import HistoricalCrops from "@/components/farm/HistoricalCrops";
import CreditOfferCard from "@/components/farm/CreditOfferCard";
import CurrentYearRevenue from "@/components/farm/CurrentYearRevenue";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert } from "lucide-react";
import { diagnoseFarmData, getClaudeResponseUrl } from "@/services/sapsProcessor";
import { useEffect } from "react";
import { toast } from "sonner";

interface FarmInfoDisplayProps {
  farmData: FarmData;
  onComplete: () => void;
  onBackToDashboard: () => void;
}

const FarmInfoDisplay: React.FC<FarmInfoDisplayProps> = ({ 
  farmData, 
  onComplete,
  onBackToDashboard
}) => {
  const [currentTab, setCurrentTab] = useState("administration");
  const [claudeResponseUrl, setClaudeResponseUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Diagnostic check for data quality
  const diagnosis = diagnoseFarmData(farmData);
  
  // Fetch Claude response URL if available
  useEffect(() => {
    const fetchClaudeResponseUrl = async () => {
      if (farmData.ocrLogId) {
        const url = await getClaudeResponseUrl(farmData.ocrLogId);
        setClaudeResponseUrl(url);
      }
    };
    
    fetchClaudeResponseUrl();
  }, [farmData.ocrLogId]);
  
  const handleNextTab = () => {
    if (currentTab === "administration") {
      setCurrentTab("blocks");
    } else if (currentTab === "blocks") {
      setCurrentTab("history");
    } else if (currentTab === "history") {
      setCurrentTab("current");
    } else if (currentTab === "current") {
      onComplete();
    }
  };
  
  const handleLoanApplication = () => {
    navigate("/loan-application", { 
      state: { 
        preApprovedAmount: farmData.totalRevenue ? Math.round(farmData.totalRevenue * 0.7) : 0,
        totalRevenue: farmData.totalRevenue || 0 
      } 
    });
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Gazdaság adatainak áttekintése</h1>
      
      {!diagnosis.isValid && (
        <Alert variant="destructive" className="mb-6">
          <CircleAlert className="h-4 w-4" />
          <AlertTitle>Figyelmeztetés</AlertTitle>
          <AlertDescription>
            {diagnosis.message} Az adatok hiányosak, de folytathatja a hiteligénylést a meglévő adatok alapján, 
            vagy visszatérhet a kezdőlapra.
          </AlertDescription>
        </Alert>
      )}
      
      {claudeResponseUrl && (
        <Alert className="mb-6">
          <AlertTitle>Claude AI válasz elérhető</AlertTitle>
          <AlertDescription>
            <p>Megtekintheti a nyers adatokat, amelyeket a Claude AI azonosított a dokumentumból:</p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => window.open(claudeResponseUrl, '_blank')}
            >
              Claude válasz megtekintése
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="mb-8">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="administration">Adminisztratív adatok</TabsTrigger>
          <TabsTrigger value="blocks">Blokkazonosítók</TabsTrigger>
          <TabsTrigger value="history">Korábbi évek</TabsTrigger>
          <TabsTrigger value="current">Aktuális adatok</TabsTrigger>
        </TabsList>
        
        <TabsContent value="administration">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <DocumentInfo 
                documentId={farmData.documentId} 
                year={farmData.year}
                submissionDate={farmData.submissionDate}
              />
              <SubmitterInfo 
                applicantName={farmData.applicantName}
                submitterId={farmData.submitterId}
                applicantId={farmData.applicantId}
                region={farmData.region}
              />
            </div>
            <div>
              <FarmSummary 
                hectares={farmData.hectares || 0} 
                cultures={farmData.cultures?.length || 0}
                blocksCount={farmData.blockIds?.length || 0}
                totalRevenue={farmData.totalRevenue || 0}
              />
              <div className="mt-6">
                <CreditOfferCard 
                  farmData={farmData}
                  onApply={handleLoanApplication}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={onBackToDashboard}>
              Vissza a kezdőlapra
            </Button>
            <Button onClick={handleNextTab}>
              Tovább a blokkazonosítókhoz
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="blocks">
          <BlocksAccordion blockIds={farmData.blockIds || []} />
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setCurrentTab("administration")}>
              Vissza az adminisztratív adatokhoz
            </Button>
            <Button onClick={handleNextTab}>
              Tovább a korábbi évekhez
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <HistoricalCrops historicalData={farmData.historicalData || []} />
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setCurrentTab("blocks")}>
              Vissza a blokkazonosítókhoz
            </Button>
            <Button onClick={handleNextTab}>
              Tovább az aktuális adatokhoz
            </Button>
          </div>
        </TabsContent>
        
        <TabsContent value="current">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <CultureTable cultures={farmData.cultures || []} />
            </div>
            <div>
              <CurrentYearRevenue 
                totalRevenue={farmData.totalRevenue || 0}
                hectares={farmData.hectares || 0}
                cultures={farmData.cultures || []}
              />
            </div>
          </div>
          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={() => setCurrentTab("history")}>
              Vissza a korábbi évekhez
            </Button>
            <Button onClick={handleLoanApplication}>
              Tovább a hitelajánlathoz
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FarmInfoDisplay;
