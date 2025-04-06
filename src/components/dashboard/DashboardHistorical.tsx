
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
        
        const data = await fetchHistoricalData(user.id);
        setHistoricalData(data);
        
        // Kiszámoljuk az átlagos bevételt
        if (data.length > 0) {
          const sum = data.reduce((acc, curr) => acc + curr.totalRevenue, 0);
          const sumEUR = data.reduce((acc, curr) => acc + curr.totalRevenueEUR, 0);
          setAverageRevenue(sum / data.length);
          setAverageRevenueEUR(sumEUR / data.length);
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
