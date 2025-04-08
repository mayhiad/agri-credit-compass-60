
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableCaption, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchHistoricalData } from "@/services/historicalDataService";
import { HistoricalYear } from "@/types/farm";
import { useAuth } from "@/App";
import { Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

interface DashboardHistoricalProps {}

const DashboardHistorical = ({}: DashboardHistoricalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalYear[]>([]);
  
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!user) return;
      
      try {
        const data = await fetchHistoricalData(user.id);
        
        // Transform data if needed to match the required structure
        const transformedData = data.map(year => ({
          ...year,
          hectares: year.totalHectares, // Ensure hectares is set
          totalRevenue: year.totalRevenueEUR || 0 // Ensure totalRevenue is set
        }));
        
        setHistoryData(transformedData);
      } catch (err) {
        console.error("Error loading historical data:", err);
        setError("Nem sikerült betölteni a történeti adatokat");
      } finally {
        setLoading(false);
      }
    };
    
    loadHistoricalData();
  }, [user]);
  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Történeti adatok</CardTitle>
          <CardDescription>A történeti adatok betöltése folyamatban...</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Adatok betöltése...</p>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Történeti adatok</CardTitle>
          <CardDescription>Hiba történt a történeti adatok betöltésekor.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Történeti adatok</CardTitle>
            <CardDescription>A gazdaság történeti adatai évenkénti bontásban.</CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700">
            <Calendar className="h-3.5 w-3.5" />
            {historyData.length > 0 ? 
              `${historyData[0].year}-${historyData[historyData.length-1].year}` : 
              "2022-2023"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {historyData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Év</TableHead>
                <TableHead className="text-right">Összes terület (ha)</TableHead>
                <TableHead className="text-right">Összes bevétel (EUR)</TableHead>
                <TableHead>Kultúrák</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyData.map((yearData, index) => (
                <TableRow key={index}>
                  <TableCell>{yearData.year}</TableCell>
                  <TableCell className="text-right">{yearData.totalHectares.toFixed(2).replace('.', ',')}</TableCell>
                  <TableCell className="text-right">{formatCurrency(yearData.totalRevenueEUR || 0)}</TableCell>
                  <TableCell>
                    {yearData.crops && yearData.crops.length > 0 ? (
                      <ul>
                        {yearData.crops.map((crop, cropIndex) => (
                          <li key={cropIndex}>
                            {crop.name} ({crop.hectares.toFixed(2).replace('.', ',')} ha)
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "Nincs adat"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nincsenek elérhető történeti adatok.</p>
            <p className="text-sm mt-2">Kérjük, vegye fel a kapcsolatot az ügyfélszolgálattal a további információkért.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardHistorical;
