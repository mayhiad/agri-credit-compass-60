
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, Clock, ArrowRight, FileWarning } from "lucide-react";
import { toast } from "sonner";
import { FarmData } from "@/components/LoanApplication";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { processSapsDocument } from "@/services/sapsProcessor";

interface FileUploadProps {
  onComplete: (farmData: FarmData) => void;
}

export const FileUpload = ({ onComplete }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Kérjük, válasszon egy SAPS dokumentumot");
      return;
    }
    
    setUploading(true);
    setError(null);
    
    try {
      // Valódi dokumentum feldolgozás
      const farmData = await processSapsDocument(file);
      
      // Sikeres feldolgozás után továbblépés
      onComplete(farmData);
      
      // Mentsük el a farmData-t localStorage-ba is az egyszerűbb folytatás érdekében
      localStorage.setItem("farmData", JSON.stringify(farmData));
    } catch (error) {
      console.error("SAPS feldolgozási hiba:", error);
      setError(error instanceof Error ? error.message : "Ismeretlen hiba történt a feldolgozás során");
      toast.error("Hiba történt a dokumentum feldolgozása során");
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
              A teljes folyamat mindössze <span className="font-bold">10 percet</span> vesz igénybe, és a szerződéskötéstől számított <span className="font-bold">48 órán belül</span> folyósítunk!
            </AlertDescription>
          </div>
        </Alert>

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
              <div className="text-sm text-gray-700 mt-2">
                Kiválasztott fájl: <span className="font-medium">{file.name}</span>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 flex items-start">
              <FileWarning className="h-5 w-5 mr-2 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </form>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={!file || uploading}
        >
          {uploading ? "Feldolgozás..." : "Dokumentum feltöltése"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FileUpload;
