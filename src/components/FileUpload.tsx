
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, Clock, ArrowRight, FileWarning, FileCheck, FileScan } from "lucide-react";
import { toast } from "sonner";
import { FarmData } from "@/components/LoanApplication";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/App";

interface FileUploadProps {
  onComplete: (farmData: FarmData) => void;
}

export const FileUpload = ({ onComplete }: FileUploadProps) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<{
    step: string;
    progress: number;
    details?: string;
  } | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
      setProcessingStatus(null);
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
      // Update status for UI feedback
      setProcessingStatus({
        step: "Dokumentum ellenőrzése",
        progress: 10,
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProcessingStatus({
        step: "Blokkazonosítók kiolvasása",
        progress: 30,
      });
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Prepare form data for the request
      const formData = new FormData();
      formData.append('file', file);
      
      setProcessingStatus({
        step: "Dokumentum feldolgozása",
        progress: 50,
      });
      
      // Get user token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Nincs érvényes felhasználói munkamenet");
      }
      
      // Call the Supabase Edge function
      const response = await fetch(
        `https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Hiba a dokumentum feldolgozása közben");
      }
      
      setProcessingStatus({
        step: "Adatok elemzése",
        progress: 70,
      });
      
      // Get the response data
      const farmData = await response.json();
      
      setProcessingStatus({
        step: "Bevétel becslés készítése",
        progress: 90,
      });
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Successfully processed
      setProcessingStatus({
        step: "Feldolgozás befejezve",
        progress: 100,
        details: `${farmData.blockIds?.length || 0} blokkazonosító, ${farmData.parcels?.length || 0} parcella, ${farmData.cultures.length} növénykultúra feldolgozva`
      });
      
      // Save to localStorage for persistence
      localStorage.setItem("farmData", JSON.stringify(farmData));
      
      // Short delay to show success state
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Move to next step
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
  
  const renderProgressBar = () => {
    if (!processingStatus) return null;
    
    return (
      <div className="mt-4">
        <div className="flex justify-between text-xs mb-1">
          <span>{processingStatus.step}</span>
          <span>{processingStatus.progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full transition-all duration-300 ease-in-out" 
            style={{ width: `${processingStatus.progress}%` }}
          />
        </div>
        {processingStatus.details && (
          <p className="text-xs text-muted-foreground mt-2">{processingStatus.details}</p>
        )}
      </div>
    );
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
              A teljes folyamat mindössze <span className="font-bold">10 percet</span> vesz igénybe, és a szerződéskötéstől számított <span className="font-bold">48 órán belül</span> folyósítunk!
            </AlertDescription>
          </div>
        </Alert>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 mb-2">
            <Badge variant="outline" className="bg-blue-50 text-blue-700">
              Blokkazonosítók kiolvasása
            </Badge>
            <Badge variant="outline" className="bg-green-50 text-green-700">
              Területadatok elemzése
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700">
              Növénykultúrák beazonosítása
            </Badge>
            <Badge variant="outline" className="bg-purple-50 text-purple-700">
              Igénylő adatainak ellenőrzése
            </Badge>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center space-y-4">
              <UploadCloud className="h-12 w-12 mx-auto text-gray-400" />
              <div className="space-y-2">
                <p className="text-sm text-gray-500">
                  PDF vagy XLS formátumban
                </p>
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                    Fájl kiválasztása
                  </span>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.xls,.xlsx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>
              {file && (
                <div className="text-sm text-gray-700 mt-2 flex items-center justify-center gap-2">
                  <FileScan className="h-4 w-4 text-primary" />
                  <span>Kiválasztott fájl: <span className="font-medium">{file.name}</span></span>
                </div>
              )}
            </div>

            {renderProgressBar()}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-start">
                <FileWarning className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}
            
            {processingStatus?.progress === 100 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-600 flex items-start">
                <FileCheck className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Dokumentum sikeresen feldolgozva</p>
                  <p className="text-xs mt-1">{processingStatus.details}</p>
                </div>
              </div>
            )}
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
