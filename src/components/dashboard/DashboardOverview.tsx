
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmData } from "@/types/farm";
import { User, FileText, Calendar, CircleDollarSign, MapPin, Hash, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface DashboardOverviewProps {
  farmData: FarmData;
}

const DashboardOverview = ({ farmData }: DashboardOverviewProps) => {
  // Check for valid data
  if (!farmData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alapadatok</CardTitle>
          <CardDescription>Hiányzó vagy érvénytelen adatok</CardDescription>
        </CardHeader>
        <CardContent className="py-10 text-center">
          <p>Nincs elegendő adat a gazdaság megjelenítéséhez.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Kérjük, töltsön fel egy SAPS dokumentumot az adatok frissítéséhez.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Card 1: Applicant Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Kérelmező adatai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Kérelmező neve</div>
              <div className="font-medium">
                {farmData.applicantName || "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Beadó azonosítója</div>
              <div className="font-medium">
                {farmData.submitterId || "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Kérelmező azonosítója</div>
              <div className="font-medium">
                {farmData.applicantId || "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Régió</div>
              <div className="font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                {farmData.region || "N/A"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Card 2: Document Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Dokumentum adatai
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Dokumentum azonosító</div>
              <div className="font-medium">
                {farmData.documentId || "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Év</div>
              <div className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-primary" />
                {farmData.year || "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Beadás dátuma</div>
              <div className="font-medium">
                {farmData.submissionDate || "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Földterület</div>
              <div className="font-medium">
                {typeof farmData.hectares === 'number' 
                  ? farmData.hectares.toFixed(2).replace('.', ',') + " ha"
                  : "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Becsült bevétel</div>
              <div className="font-medium">
                {typeof farmData.totalRevenue === 'number' 
                  ? formatCurrency(farmData.totalRevenue)
                  : "N/A"}
              </div>
            </div>
            
            {farmData.processingId && (
              <div className="mt-2 pt-2 border-t">
                <div className="flex justify-between">
                  <div className="text-sm text-muted-foreground flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    Feldolgozási azonosító
                  </div>
                  <div className="text-xs font-mono">
                    {farmData.processingId}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
