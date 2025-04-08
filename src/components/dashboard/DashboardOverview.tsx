
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FarmData } from "@/types/farm";
import { Calendar, Tractor, CircleDollarSign, FileSpreadsheet, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import CreditOfferCard from "../farm/CreditOfferCard";

interface DashboardOverviewProps {
  farmData: FarmData;
}

const DashboardOverview = ({ farmData }: DashboardOverviewProps) => {
  // Check for valid data
  if (!farmData || !farmData.cultures || farmData.cultures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Gazdaság áttekintése</CardTitle>
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
  
  // Current year if not specified
  const displayYear = farmData.year || new Date().getFullYear().toString();
  
  // Farm data calculation
  const totalHectares = farmData.hectares;
  const totalRevenue = farmData.totalRevenue;
  const avgRevenuePerHectare = totalHectares > 0 ? totalRevenue / totalHectares : 0;
  
  // Get top 3 most valuable cultures
  const topCultures = [...farmData.cultures]
    .sort((a, b) => ((b.estimatedRevenue || 0) - (a.estimatedRevenue || 0)))
    .slice(0, 3);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Card 1: Basic Info */}
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Alap információk
          </CardTitle>
          <CardDescription>
            {farmData.documentId || "SAPS igénylés adatok"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Év</div>
              <div className="font-medium flex items-center gap-1">
                <Calendar className="h-4 w-4 text-primary" />
                {displayYear}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Régió</div>
              <div className="font-medium flex items-center gap-1">
                <MapPin className="h-4 w-4 text-primary" />
                {farmData.region || "N/A"}
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm text-muted-foreground">Beadó neve</div>
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
              <div className="text-sm text-muted-foreground">Blokkazonosítók száma</div>
              <div className="font-medium">
                {farmData.blockIds?.length || 0} db
              </div>
            </div>
            {farmData.processingId && (
              <div className="flex justify-between">
                <div className="text-sm text-muted-foreground">Feldolgozási azonosító</div>
                <div className="font-medium">
                  {farmData.processingId}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Card 2: Area */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <Tractor className="h-5 w-5 text-primary" />
            Földterület
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-4">
            {typeof totalHectares === 'number' 
              ? totalHectares.toFixed(1).replace(".", ",") + " hektár"
              : "N/A"}
          </div>
          
          <div className="space-y-4">
            {topCultures.map((culture, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{culture.name || "N/A"}</span>
                  <span className="font-medium">
                    {typeof culture.hectares === 'number' 
                      ? culture.hectares.toFixed(1).replace(".", ",") + " ha"
                      : "N/A"}
                  </span>
                </div>
                <Progress 
                  value={totalHectares > 0 ? (culture.hectares / totalHectares) * 100 : 0} 
                  className="h-2" 
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Card 3: Credit Offer */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-xl flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" />
            Bevétel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold mb-2">
            {typeof totalRevenue === 'number' 
              ? formatCurrency(totalRevenue)
              : "N/A"}
          </div>
          <div className="text-sm text-muted-foreground mb-6">
            {typeof avgRevenuePerHectare === 'number' 
              ? formatCurrency(avgRevenuePerHectare) + " / hektár"
              : "N/A"}
          </div>
          
          <div className="space-y-3">
            {topCultures.map((culture, index) => (
              <div key={index} className="flex justify-between items-center">
                <span className="text-sm">{culture.name || "N/A"}</span>
                <span className="font-medium">
                  {typeof culture.estimatedRevenue === 'number' 
                    ? formatCurrency(culture.estimatedRevenue)
                    : "N/A"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Credit Offer - Full Width */}
      <div className="md:col-span-2 lg:col-span-3">
        <CreditOfferCard 
          totalRevenue={totalRevenue} 
          currentYear={displayYear}
        />
      </div>
    </div>
  );
};

export default DashboardOverview;
