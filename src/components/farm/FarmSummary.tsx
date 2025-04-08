
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { FarmData } from "@/types/farm";

interface FarmSummaryProps {
  farmData: FarmData;
}

export const FarmSummary = ({ farmData }: FarmSummaryProps) => {
  // Make sure farmData is properly defined before using its properties
  if (!farmData) return null;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">{farmData.region || "Ismeretlen régió"}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Összes terület</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{farmData.hectares ? farmData.hectares.toFixed(2) : "0.00"} ha</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Kultúrák</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{farmData.cultures ? farmData.cultures.length : 0} db</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Éves árbevétel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(farmData.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmSummary;
