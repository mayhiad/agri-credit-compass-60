
import { Button } from "@/components/ui/button";

interface DashboardEmptyStateProps {
  onShowUploadForm: () => void;
}

const DashboardEmptyState = ({ onShowUploadForm }: DashboardEmptyStateProps) => {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
      <div className="mb-6">
        <img 
          src="/placeholder.svg" 
          alt="SAPS dokumentum" 
          className="mx-auto w-32 h-32 opacity-70"
        />
      </div>
      
      <h2 className="text-2xl font-semibold mb-2">Nincsenek még gazdasági adatok</h2>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Adja hozzá gazdaságának adatait egyszerűen, töltse fel SAPS dokumentumát a hiteligénylési folyamat megkezdéséhez.
      </p>
      
      <Button onClick={onShowUploadForm} size="lg" className="mt-2">
        SAPS dokumentum feltöltése
      </Button>
    </div>
  );
};

export default DashboardEmptyState;
