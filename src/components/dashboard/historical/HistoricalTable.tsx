
import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { HistoricalFarmData, HistoricalCrop } from "./types";

interface HistoricalTableProps {
  historicalData: HistoricalFarmData[];
  averageRevenue: number;
  averageRevenueEUR: number;
}

const HistoricalTable = ({ historicalData, averageRevenue, averageRevenueEUR }: HistoricalTableProps) => {
  // Sort data by year to ensure chronological order
  const sortedData = [...historicalData].sort((a, b) => 
    parseInt(a.year) - parseInt(b.year)
  );

  // Calculate year-over-year percentage change
  const dataWithPercentageChange = sortedData.map((item, index) => {
    if (index === 0) {
      return { ...item, percentChange: 0, hectareChange: 0 };
    }
    
    const prevRevenue = sortedData[index - 1].totalRevenue;
    const percentChange = prevRevenue !== 0 
      ? ((item.totalRevenue - prevRevenue) / prevRevenue) * 100 
      : 0;
      
    const prevHectares = sortedData[index - 1].hectares;
    const hectareChange = prevHectares !== 0
      ? ((item.hectares - prevHectares) / prevHectares) * 100
      : 0;
      
    return { 
      ...item, 
      percentChange, 
      hectareChange 
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Éves bevételek és területek</CardTitle>
          <CardDescription>
            Az elmúlt évek részletes gazdasági adatai
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Év</TableHead>
                <TableHead>Terület (ha)</TableHead>
                <TableHead>Változás</TableHead>
                <TableHead className="text-right">Bevétel (HUF)</TableHead>
                <TableHead className="text-right">Bevétel (EUR)</TableHead>
                <TableHead className="text-right">Változás</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dataWithPercentageChange.map((item, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{item.year}</TableCell>
                  <TableCell>{item.hectares.toFixed(2)}</TableCell>
                  <TableCell>
                    {index === 0 ? (
                      <span className="text-gray-500 flex items-center">
                        <Minus className="h-4 w-4 mr-1" />
                        -
                      </span>
                    ) : item.hectareChange > 0 ? (
                      <span className="text-green-600 flex items-center">
                        <ArrowUp className="h-4 w-4 mr-1" />
                        {Math.abs(item.hectareChange).toFixed(1)}%
                      </span>
                    ) : item.hectareChange < 0 ? (
                      <span className="text-red-600 flex items-center">
                        <ArrowDown className="h-4 w-4 mr-1" />
                        {Math.abs(item.hectareChange).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-500 flex items-center">
                        <Minus className="h-4 w-4 mr-1" />
                        0%
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(item.totalRevenue)}</TableCell>
                  <TableCell className="text-right">{Math.round(item.totalRevenueEUR).toLocaleString()} EUR</TableCell>
                  <TableCell className="text-right">
                    {index === 0 ? (
                      <span className="text-gray-500 flex items-center justify-end">
                        <Minus className="h-4 w-4 mr-1" />
                        -
                      </span>
                    ) : item.percentChange > 0 ? (
                      <span className="text-green-600 flex items-center justify-end">
                        <ArrowUp className="h-4 w-4 mr-1" />
                        {Math.abs(item.percentChange).toFixed(1)}%
                      </span>
                    ) : item.percentChange < 0 ? (
                      <span className="text-red-600 flex items-center justify-end">
                        <ArrowDown className="h-4 w-4 mr-1" />
                        {Math.abs(item.percentChange).toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-gray-500 flex items-center justify-end">
                        <Minus className="h-4 w-4 mr-1" />
                        0%
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/50">
                <TableCell colSpan={3} className="font-medium">Átlag</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(averageRevenue)}</TableCell>
                <TableCell className="text-right font-medium">{Math.round(averageRevenueEUR).toLocaleString()} EUR</TableCell>
                <TableCell className="text-right"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Crops Detail Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Terményrészletezés</CardTitle>
          <CardDescription>
            Kultúránkénti hozamok és területek
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Év</TableHead>
                  <TableHead>Kultúra</TableHead>
                  <TableHead>Terület (ha)</TableHead>
                  <TableHead className="text-right">Termésátlag (t/ha)</TableHead>
                  <TableHead className="text-right">Összes termés (t)</TableHead>
                  <TableHead className="text-right">Bevétel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.flatMap((yearData, yearIndex) => 
                  (yearData.crops || []).map((crop, cropIndex) => (
                    <TableRow key={`${yearIndex}-${cropIndex}`}>
                      {cropIndex === 0 && (
                        <TableCell rowSpan={(yearData.crops || []).length} className="font-medium">
                          {yearData.year}
                        </TableCell>
                      )}
                      <TableCell>{crop.name}</TableCell>
                      <TableCell>{crop.hectares.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{crop.yield?.toFixed(2) || "-"}</TableCell>
                      <TableCell className="text-right">
                        {crop.yield && crop.hectares 
                          ? (crop.yield * crop.hectares).toFixed(2) 
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {crop.revenue ? formatCurrency(crop.revenue) : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HistoricalTable;
