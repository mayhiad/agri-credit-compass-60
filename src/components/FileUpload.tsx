
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { FarmData } from "@/components/LoanApplication";

interface FileUploadProps {
  onComplete: (farmData: FarmData) => void;
}

export const FileUpload = ({ onComplete }: FileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file) {
      toast.error("Kérjük, válasszon egy SAPS dokumentumot");
      return;
    }
    
    setUploading(true);
    
    try {
      // Mock file processing - in real app, we would send to a backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock farm data - in real app, this would come from backend
      const mockFarmData: FarmData = {
        hectares: 450,
        cultures: [
          { name: "Búza", hectares: 200, estimatedRevenue: 40000000 },
          { name: "Kukorica", hectares: 150, estimatedRevenue: 32000000 },
          { name: "Napraforgó", hectares: 100, estimatedRevenue: 28000000 }
        ],
        totalRevenue: 100000000, // 100 millió Ft
        region: "Dél-Alföld",
        documentId: "SAPS-2023-568742",
        applicantName: "Kovács János" // Mock applicant name from SAPS document
      };
      
      onComplete(mockFarmData);
    } catch (error) {
      toast.error("Hiba történt a dokumentum feldolgozása során");
      console.error("Upload error:", error);
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
