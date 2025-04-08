
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
        <p className="text-muted-foreground">Nem található növénykultúra adat.</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Növénykultúra</TableHead>
            <TableHead className="text-right">Terület (ha)</TableHead>
            {showPrices && (
              <>
                <TableHead className="text-right">Termésátlag (t/ha)</TableHead>
                <TableHead className="text-right">Egységár (Ft/t)</TableHead>
              </>
            )}
            {showRevenue && (
              <TableHead className="text-right">Becsült bevétel</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {farmData.cultures.map((culture, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{culture.name}</TableCell>
              <TableCell className="text-right">{formatNumber(culture.hectares)}</TableCell>
              {showPrices && (
                <>
                  <TableCell className="text-right">{culture.yieldPerHectare ? formatNumber(culture.yieldPerHectare) : "N/A"}</TableCell>
                  <TableCell className="text-right">{culture.pricePerTon ? formatCurrency(culture.pricePerTon) : "N/A"}</TableCell>
                </>
              )}
              {showRevenue && (
                <TableCell className="text-right">{culture.estimatedRevenue ? formatCurrency(culture.estimatedRevenue) : "N/A"}</TableCell>
              )}
            </TableRow>
          ))}
          
          {showRevenue && farmData.cultures.length > 1 && (
            <TableRow className="font-medium">
              <TableCell>Összes</TableCell>
              <TableCell className="text-right">{formatNumber(farmData.hectares)}</TableCell>
              {showPrices && (
                <>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right"></TableCell>
                </>
              )}
              <TableCell className="text-right">{formatCurrency(farmData.totalRevenue)}</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default CultureTable;
