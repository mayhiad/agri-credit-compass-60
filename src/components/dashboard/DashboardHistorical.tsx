
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { HistoricalCropData } from "@/components/farm/HistoricalCrops";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { useAuth } from "@/App";
import { Loader2 } from "lucide-react";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

interface HistoricalFarmData {
  year: string;
  totalHectares: number;
  totalRevenue: number;
  totalRevenueEUR: number;
  cultures: {
    name: string;
    hectares: number;
    revenue: number;
  }[];
}

interface ExtractionData {
  year?: string;
  hectares?: number;
  totalRevenue?: number;
  cultures?: Array<{
    name: string;
    hectares: number;
    estimatedRevenue: number;
  }>;
  region?: string;
  documentId?: string;
  applicantName?: string;
  blockIds?: string[];
  marketPrices?: any[];
  processedAt?: string;
}

const DashboardHistorical = () => {
  const { user } = useAuth();
  const [historicalData, setHistoricalData] = useState<HistoricalFarmData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [averageRevenue, setAverageRevenue] = useState<number>(0);
  const [averageRevenueEUR, setAverageRevenueEUR] = useState<number>(0);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Először lekérjük a diagnosztikai logokat, hogy lássuk, milyen SAPS dokumentumok lettek feltöltve
        const { data: logs, error: logsError } = await supabase
          .from('diagnostic_logs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (logsError) throw logsError;
        
        // Most lekérjük a felhasználó összes farmját
        const { data: farms, error: farmsError } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (farmsError) throw farmsError;
        
        // Minden farmhoz lekérjük a kultúrákat
        const farmData: HistoricalFarmData[] = [];
        
        if (farms && farms.length > 0) {
          for (const farm of farms) {
            const { data: cultures, error: culturesError } = await supabase
              .from('cultures')
              .select('*')
              .eq('farm_id', farm.id);
              
            if (culturesError) throw culturesError;
            
            // Történeti adat összeállítása
            const yearFromDoc = farm.document_id ? 
              farm.document_id.match(/\d{4}/) ? farm.document_id.match(/\d{4}/)[0] : "2023" : 
              "2023";
            
            const euExchangeRate = 380; // Alapértelmezett EUR/HUF árfolyam
            
            const historyEntry: HistoricalFarmData = {
              year: yearFromDoc,
              totalHectares: farm.hectares || 0,
              totalRevenue: farm.total_revenue || 0,
              totalRevenueEUR: (farm.total_revenue || 0) / euExchangeRate,
              cultures: cultures ? cultures.map(c => ({
                name: c.name,
                hectares: c.hectares || 0,
                revenue: c.estimated_revenue || 0
              })) : []
            };
            
            farmData.push(historyEntry);
          }
        }
        
        // Ha van diagnosztikai log, akkor azokból is próbálunk adatokat kinyerni
        if (logs && logs.length > 0) {
          for (const log of logs) {
            // Ne duplikáljuk az adatokat, ha már megvan a farm
            if (!log.extraction_data) continue;
            
            try {
              // Parse the extraction data if it's a string
              let extractionData: ExtractionData = {};
              
              if (typeof log.extraction_data === 'string') {
                extractionData = JSON.parse(log.extraction_data);
              } else if (typeof log.extraction_data === 'object') {
                extractionData = log.extraction_data as ExtractionData;
              } else {
                continue;
              }
              
              // Ellenőrizzük, hogy az év már szerepel-e
              const extractionYear = extractionData.year?.toString() || "2022";
              if (farmData.some(f => f.year === extractionYear)) continue;
              
              const euExchangeRate = 380; // Alapértelmezett EUR/HUF árfolyam
              
              const totalHectares = typeof extractionData.hectares === 'number' ? extractionData.hectares : 0;
              const totalRevenue = typeof extractionData.totalRevenue === 'number' ? extractionData.totalRevenue : 0;
              
              const logEntry: HistoricalFarmData = {
                year: extractionYear,
                totalHectares: totalHectares,
                totalRevenue: totalRevenue,
                totalRevenueEUR: totalRevenue / euExchangeRate,
                cultures: []
              };
              
              // Kultúrák feldolgozása, ha vannak
              if (Array.isArray(extractionData.cultures)) {
                logEntry.cultures = extractionData.cultures.map(culture => ({
                  name: culture.name || "Ismeretlen",
                  hectares: culture.hectares || 0,
                  revenue: culture.estimatedRevenue || 0
                }));
              }
              
              // Csak akkor adjuk hozzá, ha tartalmaz értelmes adatokat
              if (logEntry.totalHectares > 0) {
                farmData.push(logEntry);
              }
            } catch (parseError) {
              console.error("Error parsing extraction data:", parseError);
              // Continue with the next log if there's an error
              continue;
            }
          }
        }
        
        // Sortirozzuk év szerint
        farmData.sort((a, b) => parseInt(b.year) - parseInt(a.year));
        
        // Kiszámoljuk az átlagos bevételt az elmúlt 5 évből
        if (farmData.length > 0) {
          const sum = farmData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
          const sumEUR = farmData.reduce((acc, curr) => acc + curr.totalRevenueEUR, 0);
          setAverageRevenue(sum / farmData.length);
          setAverageRevenueEUR(sumEUR / farmData.length);
        }
        
        setHistoricalData(farmData);
      } catch (err) {
        console.error("Hiba a történeti adatok lekérésekor:", err);
        setError("Nem sikerült betölteni a történeti adatokat");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHistoricalData();
  }, [user]);
  
  const chartData = historicalData.map(data => ({
    name: data.year,
    'Bevétel (HUF)': data.totalRevenue / 1000000, // millió forintban
    'Bevétel (EUR)': data.totalRevenueEUR / 1000, // ezer euróban
    hectares: data.totalHectares
  }));
  
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
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Bevétel trend az elmúlt 5 évben</h3>
                  <p className="text-sm text-muted-foreground">
                    Az elmúlt {historicalData.length} év átlagos bevétele: 
                    <span className="font-bold ml-1">{formatCurrency(averageRevenue)}</span> 
                    <span className="text-xs ml-1">({formatCurrency(averageRevenueEUR, "EUR")})</span>
                  </p>
                  
                  <div className="h-[350px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis yAxisId="left" orientation="left" stroke="#82ca9d" />
                        <YAxis yAxisId="right" orientation="right" stroke="#8884d8" />
                        <Tooltip formatter={(value, name) => {
                          if (name === 'Bevétel (HUF)') return [`${value} millió Ft`, 'Bevétel (HUF)'];
                          if (name === 'Bevétel (EUR)') return [`${value} ezer EUR`, 'Bevétel (EUR)'];
                          return [value, name];
                        }} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="Bevétel (HUF)" fill="#8884d8" name="Bevétel (millió Ft)" />
                        <Bar yAxisId="right" dataKey="Bevétel (EUR)" fill="#82ca9d" name="Bevétel (ezer EUR)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Összterület trend</h3>
                  <div className="h-[250px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="hectares" fill="#ffc658" name="Hektár" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>Nincs megjeleníthető történeti adat.</p>
                <p className="text-sm mt-2">Töltsön fel SAPS dokumentumokat a korábbi évekből a történeti adatok megjelenítéséhez.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="table">
            {historicalData.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Összesített éves adatok</h3>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Év</TableHead>
                          <TableHead className="text-right">Összterület (ha)</TableHead>
                          <TableHead className="text-right">Bevétel (Ft)</TableHead>
                          <TableHead className="text-right">Bevétel (EUR)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historicalData.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">{item.year}</TableCell>
                            <TableCell className="text-right">{item.totalHectares.toFixed(2)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.totalRevenueEUR, "EUR")}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="bg-muted/50">
                          <TableCell className="font-bold">Átlag</TableCell>
                          <TableCell className="text-right font-bold">
                            {(historicalData.reduce((acc, curr) => acc + curr.totalHectares, 0) / historicalData.length).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(averageRevenue)}</TableCell>
                          <TableCell className="text-right font-bold">{formatCurrency(averageRevenueEUR, "EUR")}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>Nincs megjeleníthető történeti adat.</p>
                <p className="text-sm mt-2">Töltsön fel SAPS dokumentumokat a korábbi évekből a történeti adatok megjelenítéséhez.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DashboardHistorical;
