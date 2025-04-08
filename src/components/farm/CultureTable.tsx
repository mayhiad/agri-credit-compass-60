
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { FarmData } from "@/types/farm";

interface CultureTableProps {
  farmData: FarmData;
  showPrices?: boolean;
  showRevenue?: boolean;
}

export const CultureTable = ({ farmData, showPrices = true, showRevenue = true }: CultureTableProps) => {
  if (!farmData.cultures || farmData.cultures.length === 0) {
    return (
      <div className="text-center p-4 bg-muted/20 rounded-md">
        <p className="text-muted-foreground">Nincs növénykultúra információ.</p>
      </div>
    );
  }

  const totalHectares = farmData.cultures.reduce((sum, culture) => sum + culture.hectares, 0);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Növénykultúrák</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Növénykultúra</TableHead>
              <TableHead className="text-center">Terület (ha)</TableHead>
              <TableHead className="text-center">Megoszlás (%)</TableHead>
              {showPrices && (
                <>
                  <TableHead className="text-center">Termésátlag (t/ha)</TableHead>
                  <TableHead className="text-center">Piaci ár (Ft/t)</TableHead>
                </>
              )}
              {showRevenue && (
                <TableHead className="text-right">Bevétel (Ft)</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmData.cultures.map((culture, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{culture.name}</TableCell>
                <TableCell className="text-center">{formatNumber(culture.hectares, 1)}</TableCell>
                <TableCell className="text-center">
                  {formatNumber((culture.hectares / totalHectares) * 100, 1)}%
                </TableCell>
                {showPrices && (
                  <>
                    <TableCell className="text-center">{formatNumber(culture.yieldPerHectare, 1)}</TableCell>
                    <TableCell className="text-center">{formatNumber(culture.pricePerTon, 0)}</TableCell>
                  </>
                )}
                {showRevenue && (
                  <TableCell className="text-right">{formatNumber(culture.estimatedRevenue, 0)}</TableCell>
                )}
              </TableRow>
            ))}
            
            <TableRow className="bg-muted/20 font-semibold">
              <TableCell>Összesen</TableCell>
              <TableCell className="text-center">{formatNumber(totalHectares, 1)}</TableCell>
              <TableCell className="text-center">100%</TableCell>
              {showPrices && (
                <>
                  <TableCell className="text-center">-</TableCell>
                  <TableCell className="text-center">-</TableCell>
                </>
              )}
              {showRevenue && (
                <TableCell className="text-right">{formatNumber(farmData.totalRevenue, 0)}</TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CultureTable;
