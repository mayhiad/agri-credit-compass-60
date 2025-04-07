
import { Button } from "@/components/ui/button";
import DashboardError from "./DashboardError";

interface DashboardErrorViewProps {
  error: string;
  onRetry: () => void;
  onAddFarmData: () => void;
}

const DashboardErrorView = ({ error, onRetry, onAddFarmData }: DashboardErrorViewProps) => {
  return (
    <div className="space-y-4">
      <DashboardError message={error} />
      <div className="flex justify-center gap-4 mt-4">
        <Button onClick={onRetry} variant="outline">Újrapróbálkozás</Button>
        <Button onClick={onAddFarmData}>SAPS dokumentum feltöltése</Button>
      </div>
    </div>
  );
};

export default DashboardErrorView;
