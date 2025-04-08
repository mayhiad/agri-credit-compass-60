
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HistoricalFarmData } from "./historical/types";
import { useAuth } from "@/App";
import { Loader2 } from "lucide-react";
import HistoricalChart from "./historical/HistoricalChart";
import HistoricalTable from "./historical/HistoricalTable";
import EmptyHistoricalState from "./historical/EmptyHistoricalState";
import { fetchHistoricalData } from "@/services/historicalDataService";
import { HistoricalYear } from "@/types/farm";

const DashboardHistorical = () => {
  const { user } = useAuth();
  const [historicalData, setHistoricalData] = useState<HistoricalFarmData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRevenue, setAverageRevenue] = useState<number>(0);
  const [averageRevenueEUR, setAverageRevenueEUR] = useState<number>(0);

  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Pass user id and farm id (null for now, will be implemented later)
        const rawData = await fetchHistoricalData(null, user.id);
        
        // Convert HistoricalYear[] to HistoricalFarmData[]
        const convertedData: HistoricalFarmData[] = rawData.map(year => ({
          year: year.year,
          totalHectares: year.totalHectares,
          hectares: year.totalHectares, // Using totalHectares as hectares
          totalRevenue: year.totalRevenueEUR ? year.totalRevenueEUR * 390 : 0, // Convert EUR to HUF (approx)
          totalRevenueEUR: year.totalRevenueEUR || 0,
          crops: year.crops
        }));
        
        setHistoricalData(convertedData);
        
        // Calculate average revenue
        if (convertedData.length > 0) {
          const sum = convertedData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
          const sumEUR = convertedData.reduce((acc, curr) => acc + curr.totalRevenueEUR, 0);
          setAverageRevenue(sum / convertedData.length);
          setAverageRevenueEUR(sumEUR / convertedData.length);
        }
      } catch (err) {
        console.error("Hiba a történeti adatok lekérésekor:", err);
        setError("Nem sikerült betölteni a történeti adatokat");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadHistoricalData();
  }, [user]);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Történeti adatok</CardTitle>
          <CardDescription>Gazdaság történeti adatainak betöltése folyamatban...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Történeti adatok</CardTitle>
          <CardDescription>Hiba történt a gazdaság történeti adatainak betöltésekor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center">
            <p className="text-red-500">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Történeti adatok</CardTitle>
        <CardDescription>Gazdaság korábbi éveinek kimutatása a SAPS dokumentumok alapján</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="chart">
          <TabsList className="mb-4">
            <TabsTrigger value="chart">Grafikon</TabsTrigger>
            <TabsTrigger value="table">Táblázat</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chart">
            {historicalData.length > 0 ? (
              <HistoricalChart 
                historicalData={historicalData}
                averageRevenue={averageRevenue}
                averageRevenueEUR={averageRevenueEUR}
              />
            ) : (
              <EmptyHistoricalState />
            )}
          </TabsContent>
          
          <TabsContent value="table">
            {historicalData.length > 0 ? (
              <HistoricalTable 
                historicalData={historicalData}
                averageRevenue={averageRevenue}
                averageRevenueEUR={averageRevenueEUR}
              />
            ) : (
              <EmptyHistoricalState />
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DashboardHistorical;
