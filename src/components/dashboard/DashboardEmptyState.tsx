import React from "react";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

interface DashboardEmptyStateProps {
  onShowUploadForm: () => void;
}

const DashboardEmptyState = ({ onShowUploadForm }: DashboardEmptyStateProps) => {
  return (
    <div className="text-center p-12 border border-dashed border-gray-300 rounded-lg bg-gray-50">
      <div className="flex flex-col items-center max-w-md mx-auto space-y-6">
        <div className="bg-primary/10 p-4 rounded-full">
          <FileText className="h-10 w-10 text-primary" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-medium">Nincs még feltöltött SAPS dokumentum</h3>
          <p className="text-muted-foreground">
            Kezdje a gazdálkodását egy SAPS egységes kérelem dokumentum feltöltésével, hogy láthassa a gazdasága adatait.
          </p>
        </div>
        
        <Button onClick={onShowUploadForm} size="lg">
          SAPS dokumentum feltöltése
        </Button>
      </div>
    </div>
  );
};

export default DashboardEmptyState;
