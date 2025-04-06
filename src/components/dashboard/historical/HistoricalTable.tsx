
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { HistoricalFarmData } from "./types";

interface HistoricalTableProps {
  historicalData: HistoricalFarmData[];
  averageRevenue: number;
  averageRevenueEUR: number;
}

const HistoricalTable = ({ historicalData, averageRevenue, averageRevenueEUR }: HistoricalTableProps) => {
  return (
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
  );
};

export default HistoricalTable;
