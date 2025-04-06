
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface HistoricalCropData {
  year: string;
  culture: string;
  averageYield: number;
  price: number;
  region: string;
}

interface HistoricalCropsProps {
  historicalData: HistoricalCropData[];
}

const HistoricalCrops = ({ historicalData }: HistoricalCropsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Korábbi évek terményárai</CardTitle>
      </CardHeader>
      <CardContent>
        {historicalData && historicalData.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Év</TableHead>
                <TableHead>Kultúra</TableHead>
                <TableHead>Átlag termésátlag (t/ha)</TableHead>
                <TableHead>Piaci ár (Ft/t)</TableHead>
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
                  <TableCell>{item.region}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-4 text-muted-foreground">
            Nincs elérhető historikus termény adat.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HistoricalCrops;
