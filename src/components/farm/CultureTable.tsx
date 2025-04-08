
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tractor, TrendingUp } from "lucide-react";
import { Culture } from "@/types/farm";

export interface CultureTableProps {
  cultures: Culture[];
}

const CultureTable: React.FC<CultureTableProps> = ({ cultures }) => {
  // Format numbers with local separator
  const formatNumber = (num: number) => {
    return num.toLocaleString('hu-HU');
  };
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('hu-HU', { 
      style: 'currency', 
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  if (!cultures || cultures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tractor className="h-5 w-5 text-primary" />
            Növénykultúrák
          </CardTitle>
          <CardDescription>
            Nem található növénykultúra a dokumentumban
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A dokumentumban nem sikerült növénykultúrákat felismerni, vagy nem tartalmazott ilyeneket.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tractor className="h-5 w-5 text-primary" />
          Növénykultúrák
        </CardTitle>
        <CardDescription>
          A gazdaságban termesztett növénykultúrák listája
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Növénykultúra</TableHead>
              <TableHead className="text-right">Terület (ha)</TableHead>
              <TableHead className="text-right">Várható bevétel</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cultures.map((culture, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{culture.name}</TableCell>
                <TableCell className="text-right">{formatNumber(culture.hectares)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {culture.estimatedRevenue ? (
                      <>
                        <TrendingUp className={`h-4 w-4 ${culture.estimatedRevenue > 0 ? 'text-green-500' : 'text-red-500'}`} />
                        {formatCurrency(culture.estimatedRevenue)}
                      </>
                    ) : 'N/A'}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default CultureTable;
