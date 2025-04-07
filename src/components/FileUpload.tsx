
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { FarmData } from "@/components/LoanApplication";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/App";
import UploadArea from "@/components/upload/UploadArea";
import ProcessingStatus from "@/components/upload/ProcessingStatus";
import ErrorDisplay from "@/components/upload/ErrorDisplay";
import SuccessMessage from "@/components/upload/SuccessMessage";
import { ProcessingStatus as ProcessingStatusType, processSapsDocument } from "@/services/uploadProcessingService";
import { saveFarmDataToDatabase } from "@/services/farmDataService";

interface FileUploadProps {
  onComplete: (farmData: FarmData) => void;
}

export const FileUpload = ({ onComplete }: FileUploadProps) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatusType | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = ['application/pdf', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError(null);
        setProcessingStatus(null);
      } else {
        toast.error("Kérjük, PDF vagy Excel formátumú dokumentumot töltsön fel");
        setFile(null);
      }
    }
  };
  
  const processDocument = async () => {
    if (!file) {
      toast.error("Kérjük, válasszon egy SAPS dokumentumot");
      return;
    }
    
    if (!user) {
      toast.error("A dokumentum feldolgozásához be kell jelentkeznie");
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      // Feldolgozzuk a dokumentumot
      setProcessingStatus({
        step: "Dokumentum AI elemzése",
        progress: 10,
        details: "A feltöltött dokumentum Claude AI elemzése folyamatban..."
      });
      
      const farmData = await processSapsDocument(file, user, setProcessingStatus);
      
      // Mentsük el az adatbázisba a feldolgozott adatokat
      setProcessingStatus({
        step: "Adatok mentése az adatbázisba",
        progress: 95,
        details: "Alapadatok és dokumentum azonosító rögzítése..."
      });
      
      try {
        const farmId = await saveFarmDataToDatabase(farmData, user.id);
        
        if (farmId) {
          // Frissítsük a farm adatait a farmId-vel
          farmData.farmId = farmId;
        }
        
        localStorage.setItem("farmData", JSON.stringify(farmData));
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setProcessingStatus({
          step: "Feldolgozás befejezve",
          progress: 100,
          details: `Gazdálkodó adatai sikeresen feldolgozva: ${farmData.applicantName || "Ismeretlen gazdálkodó"}`
        });
        
        onComplete(farmData);
        toast.success("SAPS dokumentum sikeresen feldolgozva Claude AI-jal");
      } catch (dbError) {
        console.error("Adatbázis mentési hiba:", dbError);
        toast.error("Az adatok adatbázisba mentése nem sikerült, de a dokumentum feldolgozása sikeres volt");
        // Annak ellenére hogy adatbázis hiba történt, az onComplete-et meghívjuk
        // hiszen a dokumentum feldolgozás sikeres volt
        onComplete(farmData);
      }
      
    } catch (error) {
      console.error("SAPS feldolgozási hiba:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Ismeretlen hiba történt a feldolgozás során";
        
      setError(errorMessage);
      toast.error("Hiba történt a dokumentum feldolgozása során");
      
      setProcessingStatus({
        step: "Hiba a feldolgozás során",
        progress: 0,
        details: errorMessage
      });
    } finally {
      setUploading(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processDocument();
  };
  
  const handleRetry = () => {
    processDocument();
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>SAPS dokumentum feltöltése</CardTitle>
        <CardDescription>
          Kérjük, töltse fel legfrissebb SAPS dokumentumát a hitelkeret megállapításához
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-700">
              A teljes folyamat mindössze <span className="font-bold">1-2 percet</span> vesz igénybe, és a szerződéskötéstől számított <span className="font-bold">48 órán belül</span> folyósítunk!
            </AlertDescription>
          </div>
        </Alert>

        <Alert className="mb-4 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            A dokumentumnak tartalmaznia kell a gazdálkodó nevét és azonosítószámát, ezek nélkül a feldolgozás sikertelen lehet.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Gazdálkodó azonosítása
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              Igénylő adatainak ellenőrzése
            </Badge>
          </div>
          
          <form onSubmit={handleSubmit}>
            <UploadArea file={file} onFileChange={handleFileChange} />
            <ProcessingStatus status={processingStatus} />
            
            <ErrorDisplay message={error} onRetry={handleRetry} />
            <SuccessMessage status={processingStatus} />
          </form>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={!file || uploading}
        >
          {uploading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              {processingStatus?.step || "Feldolgozás..."}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Dokumentum feltöltése
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
