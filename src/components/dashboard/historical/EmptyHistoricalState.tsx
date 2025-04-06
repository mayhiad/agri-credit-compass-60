
import React from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EmptyHistoricalState = () => {
  const navigate = useNavigate();

  const handleUploadClick = () => {
    navigate("/dashboard?tab=upload");
  };

  return (
    <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg p-8 bg-muted/20">
      <h3 className="text-xl font-semibold mb-2">Nincs megjeleníthető történeti adat</h3>
      <p className="mb-6">Töltsön fel SAPS dokumentumokat a korábbi évekből a történeti adatok megjelenítéséhez.</p>
      <Button onClick={handleUploadClick} variant="outline" className="gap-2">
        <Upload size={16} />
        SAPS dokumentum feltöltése
      </Button>
    </div>
  );
};

export default EmptyHistoricalState;
