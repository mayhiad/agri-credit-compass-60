
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import FarmLocation from "@/components/FarmLocation";

const DashboardMap = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Földterületek</CardTitle>
        <CardDescription>
          A SAPS dokumentum alapján azonosított földterületek térképe
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-96 rounded-md overflow-hidden border">
          <FarmLocation />
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardMap;
