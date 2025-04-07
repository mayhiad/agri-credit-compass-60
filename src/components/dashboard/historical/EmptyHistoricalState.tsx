
import React from "react";
import { FileArchive, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const EmptyHistoricalState = () => {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate("/dashboard", { state: { showUpload: true } });
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mb-6">
        <FileArchive className="h-10 w-10 text-gray-500" />
      </div>
      
      <h3 className="text-lg font-medium mb-2">Nincsenek historikus adatok</h3>
      
      <p className="text-muted-foreground mb-6 max-w-md">
        Még nincsenek korábbi évekből származó gazdasági adatok. Töltsön fel korábbi évek SAPS dokumentumait a historikus adatok megjelenítéséhez.
      </p>
      
      <Button onClick={handleUploadClick} variant="outline" className="gap-2">
        <Upload className="h-4 w-4" />
        SAPS dokumentum feltöltése
      </Button>

      <p className="text-xs text-muted-foreground mt-6 max-w-md">
        A historikus adatok feldolgozása lehetővé teszi a gazdálkodás hatékonyságának jobb elemzését és a jövőbeli trendek előrejelzését.
      </p>
    </div>
  );
};

export default EmptyHistoricalState;
