
import React from "react";
import { Button } from "@/components/ui/button";
import { Upload, FileText, BarChart3, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

const EmptyHistoricalState = () => {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate("/dashboard?tab=upload");
  };

  return (
    <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg p-8 bg-muted/20">
      <div className="flex flex-col items-center gap-2 mb-4">
        <div className="p-3 bg-blue-50 rounded-full">
          <FileText className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-xl font-semibold">Nincs megjeleníthető történeti adat</h3>
      </div>
      
      <p className="mb-4">Töltsön fel SAPS dokumentumokat a korábbi évekből a történeti adatok megjelenítéséhez.</p>
      
      <Alert className="mb-6 bg-amber-50 border-amber-200">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          A rendszer csak a megfelelő formátumú és tartalmú SAPS dokumentumokból tud adatokat kinyerni. 
          Kérjük, ellenőrizze, hogy a feltöltött dokumentum tartalmaz-e növénykultúra és területadatokat.
        </AlertDescription>
      </Alert>
      
      <div className="grid gap-4 md:grid-cols-2 max-w-lg mx-auto mb-6">
        <div className="bg-amber-50 p-4 rounded-lg text-left">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-5 w-5 text-amber-500" />
            <span className="font-medium text-amber-800">Miért fontos?</span>
          </div>
          <p className="text-sm text-amber-700">A történeti adatok segítenek a gazdaság teljesítményének elemzésében és a jövőbeni trendek előrejelzésében.</p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-lg text-left">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <span className="font-medium text-blue-800">Mit fog látni?</span>
          </div>
          <p className="text-sm text-blue-700">Évenkénti összehasonlítást, növénykultúrák változását és árbevételi trendeket.</p>
        </div>
      </div>
      
      <Button onClick={handleUploadClick} variant="outline" className="gap-2">
        <Upload size={16} />
        SAPS dokumentum feltöltése
      </Button>
    </div>
  );
};

export default EmptyHistoricalState;
