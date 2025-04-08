
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { HistoricalYear } from "@/types/farm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface HistoricalCropsProps {
  historicalData: HistoricalYear[];
}

export const HistoricalCrops = ({ historicalData }: HistoricalCropsProps) => {
  if (!historicalData || historicalData.length === 0) {
    return (
      <div className="text-center p-4 bg-muted/20 rounded-md">
        <p className="text-muted-foreground">Nem található történeti adat.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {historicalData.map((yearData, yearIndex) => (
        <Card key={yearIndex} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle>{yearData.year}. év</CardTitle>
            <CardDescription>
              Összterület: {formatNumber(yearData.totalHectares)} hektár
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Növénykultúra</TableHead>
                  <TableHead className="text-right">Terület (ha)</TableHead>
                  <TableHead className="text-right">Termésátlag (t/ha)</TableHead>
                  <TableHead className="text-right">Összes termés (t)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearData.crops.map((crop, cropIndex) => (
                  <TableRow key={cropIndex}>
                    <TableCell className="font-medium">{crop.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(crop.hectares)}</TableCell>
                    <TableCell className="text-right">{formatNumber(crop.yield)}</TableCell>
                    <TableCell className="text-right">{formatNumber(crop.totalYield || (crop.yield * crop.hectares))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HistoricalCrops;
