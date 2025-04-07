import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight, AlertTriangle, FileText } from "lucide-react";
import { toast } from "sonner";
import { FarmData } from "@/types/farm";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/App";
import UploadArea from "@/components/upload/UploadArea";
import ProcessingStatus from "@/components/upload/ProcessingStatus";
import ErrorDisplay from "@/components/upload/ErrorDisplay";
import SuccessMessage from "@/components/upload/SuccessMessage";
import { processSapsDocument } from "@/services/uploadProcessingService";
import { ProcessingStatus as ProcessingStatusType } from "@/types/processing";
import { validateDocumentFile } from "@/services/documentValidation";

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
      const validation = validateDocumentFile(selectedFile);
      
      if (validation.valid) {
        setFile(selectedFile);
        setError(null);
        setProcessingStatus(null);
      } else {
        toast.error(validation.error || "Nem támogatott fájlformátum");
        setFile(null);
      }
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      // Feldolgozzuk a dokumentumot Claude-dal
      setProcessingStatus({
        step: "Dokumentum Claude AI elemzése",
        progress: 10,
        details: "A feltöltött dokumentum Claude AI elemzése folyamatban..."
      });
      
      const farmData = await processSapsDocument(file, user, setProcessingStatus);
      
      onComplete(farmData);
      toast.success("SAPS dokumentum sikeresen feldolgozva");
      
    } catch (error) {
      console.error("SAPS feldolgozási hiba:", error);
      setError(error instanceof Error ? error.message : "Ismeretlen hiba történt a feldolgozás során");
      toast.error("Hiba történt a dokumentum feldolgozása során");
      
      setProcessingStatus(null);
    } finally {
      setUploading(false);
    }
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
            A dokumentumnak tartalmaznia kell az ügyfél nevét és azonosítóját, ezek nélkül a feldolgozás sikertelen lehet.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Ügyfél-azonosító kiolvasása
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Ügyfél adatok elemzése
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              Igénylő adatainak ellenőrzése
            </Badge>
          </div>
          
          <form onSubmit={handleSubmit}>
            <UploadArea file={file} onFileChange={handleFileChange} />
            <ProcessingStatus status={processingStatus} />
            
            {processingStatus?.wordDocumentUrl && (
              <Alert className="mt-4 mb-2 bg-green-50 border-green-200">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <div className="flex-1">
                    <AlertDescription className="text-green-800">
                      Az OCR eredmények Word dokumentumként elérhetőek:
                    </AlertDescription>
                  </div>
                  <Button variant="outline" className="bg-white" size="sm" asChild>
                    <a href={processingStatus.wordDocumentUrl} target="_blank" rel="noopener noreferrer">
                      Letöltés
                    </a>
                  </Button>
                </div>
              </Alert>
            )}
            
            <ErrorDisplay message={error} />
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
