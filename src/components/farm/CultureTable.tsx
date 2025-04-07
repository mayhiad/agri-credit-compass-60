
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/types/farm";
import { formatCurrency } from "@/lib/utils";

interface CultureTableProps {
  farmData: FarmData;
}

export const CultureTable = ({ farmData }: CultureTableProps) => {
  if (!farmData || !farmData.cultures || farmData.cultures.length === 0) {
    return null;
  }
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kultúra</TableHead>
            <TableHead className="text-right">Terület (ha)</TableHead>
            <TableHead className="text-right">Becsült bevétel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {farmData.cultures.map((culture, idx) => (
            <TableRow key={idx}>
              <TableCell>{culture.name}</TableCell>
              <TableCell className="text-right">{culture.hectares ? culture.hectares.toFixed(2) : "0.00"}</TableCell>
              <TableCell className="text-right">{formatCurrency(culture.estimatedRevenue || 0)}</TableCell>
            </TableRow>
          ))}
          <TableRow>
            <TableCell className="font-medium">Összesen</TableCell>
            <TableCell className="text-right font-medium">{farmData.hectares ? farmData.hectares.toFixed(2) : "0.00"} ha</TableCell>
            <TableCell className="text-right font-medium">{formatCurrency(farmData.totalRevenue || 0)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};

export default CultureTable;
