
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

// Define the structure for historical crop data
export interface HistoricalCropData {
  id: string;
  name: string;
  type: string;
  yearlyData: {
    year: number;
    area?: number;  // hectares
    yield?: number; // tons per hectare
  }[];
}

interface HistoricalCropsProps {
  cropData: HistoricalCropData[];
  title?: string;
  description?: string;
}

const HistoricalCrops = ({ 
  cropData, 
  title = "Történeti adatok", 
  description = "Korábbi évek termésadatai"
}: HistoricalCropsProps) => {
  
  // Get unique years from the data
  const years = cropData.length > 0 
    ? [...new Set(cropData.flatMap(crop => crop.yearlyData.map(data => data.year)))]
        .sort((a, b) => a - b)
    : [];

  // Calculate yield trends for each crop
  const getYieldTrend = (crop: HistoricalCropData) => {
    const validYieldData = crop.yearlyData
      .filter(data => data.yield !== undefined && data.yield !== null)
      .sort((a, b) => a.year - b.year);
    
    if (validYieldData.length < 2) return 0; // Not enough data

    const firstYield = validYieldData[0].yield!;
    const lastYield = validYieldData[validYieldData.length - 1].yield!;
    
    if (lastYield > firstYield) return 1;  // Upward trend
    if (lastYield < firstYield) return -1; // Downward trend
    return 0; // No change
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {years.length > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 bg-blue-50 text-blue-700">
              <Calendar className="h-3.5 w-3.5" />
              {years[0]}-{years[years.length - 1]} időszak
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {cropData.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Növénykultúra</TableHead>
                  <TableHead>Kód</TableHead>
                  <TableHead>Trend</TableHead>
                  {years.map(year => (
                    <TableHead key={year} colSpan={2} className="text-center border-l">
                      {year}
                    </TableHead>
                  ))}
                </TableRow>
                <TableRow>
                  <TableHead colSpan={3}></TableHead>
                  {years.map(year => (
                    <>
                      <TableHead key={`${year}-area`} className="text-right text-xs text-muted-foreground">
                        ha
                      </TableHead>
                      <TableHead key={`${year}-yield`} className="text-right text-xs text-muted-foreground">
                        t/ha
                      </TableHead>
                    </>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {cropData.map((crop) => {
                  const trend = getYieldTrend(crop);
                  
                  return (
                    <TableRow key={crop.id}>
                      <TableCell className="font-medium">{crop.name}</TableCell>
                      <TableCell className="text-muted-foreground">{crop.id}</TableCell>
                      <TableCell>
                        {trend > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : trend < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        ) : (
                          <Minus className="h-4 w-4 text-gray-500" />
                        )}
                      </TableCell>
                      
                      {years.map(year => {
                        const yearData = crop.yearlyData.find(data => data.year === year);
                        
                        return (
                          <>
                            <TableCell key={`${crop.id}-${year}-area`} className="text-right">
                              {yearData?.area !== undefined ? 
                                yearData.area.toFixed(2).replace('.', ',') : 
                                "-"}
                            </TableCell>
                            <TableCell key={`${crop.id}-${year}-yield`} className="text-right">
                              {yearData?.yield !== undefined ? 
                                yearData.yield.toFixed(2).replace('.', ',') : 
                                "-"}
                            </TableCell>
                          </>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nem található történeti adat a növénykultúrákról.</p>
            <p className="text-sm mt-2">A történeti adatok a SAPS dokumentum feldolgozása során kerülnek kinyerésre.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoricalCrops;
