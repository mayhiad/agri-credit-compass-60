
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/components/LoanApplication";
import { formatCurrency } from "@/lib/utils";

interface DashboardCropsProps {
  farmData: FarmData;
}

const DashboardCrops = ({ farmData }: DashboardCropsProps) => {
  // Mock piaci árak
  const marketPrices: Record<string, number> = {
    "Búza": 85000,
    "Kukorica": 75000,
    "Napraforgó": 180000
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Növénykultúrák</CardTitle>
        <CardDescription>
          A SAPS dokumentum alapján rögzített növénykultúrák
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kultúra</TableHead>
              <TableHead className="text-right">Terület (ha)</TableHead>
              <TableHead className="text-right">Becsült bevétel</TableHead>
              <TableHead className="text-right">Piaci ár (Ft/tonna)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmData.cultures.map((culture, idx) => {
              const price = marketPrices[culture.name] || 100000;
              
              return (
                <TableRow key={idx}>
                  <TableCell>{culture.name}</TableCell>
                  <TableCell className="text-right">{culture.hectares}</TableCell>
                  <TableCell className="text-right">{formatCurrency(culture.estimatedRevenue)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                </TableRow>
              );
            })}
            <TableRow>
              <TableCell className="font-medium">Összesen</TableCell>
              <TableCell className="text-right font-medium">{farmData.hectares} ha</TableCell>
              <TableCell className="text-right font-medium">{formatCurrency(farmData.totalRevenue)}</TableCell>
              <TableCell className="text-right"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DashboardCrops;
