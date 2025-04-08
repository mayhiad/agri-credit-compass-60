
import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

// Export the interface to make it available for other components
export interface HistoricalCropData {
  year: string;
  culture: string;
  averageYield: number;
  price: number;
  region: string;
}

interface HistoricalCropsProps {
  historicalData: HistoricalCropData[];
}

// Helper function to calculate EUR price (assuming price is in HUF)
const calculateEurPrice = (priceHuf: number, exchangeRate: number = 390): number => {
  return priceHuf / exchangeRate;
};

// Helper function to calculate revenue
const calculateRevenue = (yieldValue: number, price: number): number => {
  return yieldValue * price;
};

const HistoricalCrops = ({ historicalData }: HistoricalCropsProps) => {
  // Group data by year to calculate yearly revenue
  const yearlyRevenueData = useMemo(() => {
    const groupedByYear = historicalData.reduce((acc, item) => {
      const year = item.year;
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(item);
      return acc;
    }, {} as Record<string, HistoricalCropData[]>);

    // Calculate total revenue by year
    return Object.entries(groupedByYear).map(([year, crops]) => {
      const totalRevenueHuf = crops.reduce((sum, crop) => {
        return sum + calculateRevenue(crop.averageYield, crop.price);
      }, 0);
      
      const totalRevenueEur = calculateEurPrice(totalRevenueHuf);
      
      return {
        year,
        revenueHuf: totalRevenueHuf,
        revenueEur: totalRevenueEur
      };
    }).sort((a, b) => a.year.localeCompare(b.year));
  }, [historicalData]);

  // Calculate 5-year average revenue
  const averageRevenueEur = useMemo(() => {
    if (yearlyRevenueData.length === 0) return 0;
    const total = yearlyRevenueData.reduce((sum, item) => sum + item.revenueEur, 0);
    return total / yearlyRevenueData.length;
  }, [yearlyRevenueData]);

  // Prepare data for the chart
  const chartData = useMemo(() => {
    return yearlyRevenueData.map(item => ({
      year: item.year,
      "Árbevétel (EUR)": Math.round(item.revenueEur)
    }));
  }, [yearlyRevenueData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Korábbi évek terményárai és bevételei</CardTitle>
      </CardHeader>
      <CardContent>
        {historicalData && historicalData.length > 0 ? (
          <>
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4">Éves árbevétel (EUR)</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Árbevétel (EUR)" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <p className="text-center">
                  <span className="font-medium">Elmúlt {yearlyRevenueData.length} év átlagos árbevétele: </span>
                  <span className="text-lg font-bold">{Math.round(averageRevenueEur).toLocaleString()} EUR</span>
                </p>
              </div>
            </div>

            <h3 className="text-lg font-medium mb-4">Termény adatok részletezése</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Év</TableHead>
                  <TableHead>Kultúra</TableHead>
                  <TableHead>Átlag termésátlag (t/ha)</TableHead>
                  <TableHead>Piaci ár (Ft/t)</TableHead>
                  <TableHead>Piaci ár (EUR/t)</TableHead>
                  <TableHead>Régió</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historicalData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.year}</TableCell>
                    <TableCell>{item.culture}</TableCell>
                    <TableCell>{item.averageYield.toFixed(2)}</TableCell>
                    <TableCell>{item.price.toLocaleString()} Ft</TableCell>
                    <TableCell>{Math.round(calculateEurPrice(item.price)).toLocaleString()} EUR</TableCell>
                    <TableCell>{item.region}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Nincs elérhető historikus termény adat.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Custom tooltip for the chart
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border rounded shadow-sm">
        <p className="font-medium">{payload[0].payload.year}</p>
        <p>{`Árbevétel: ${payload[0].value.toLocaleString()} EUR`}</p>
      </div>
    );
  }
  return null;
};

export default HistoricalCrops;
