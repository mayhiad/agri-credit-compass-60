
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/types/farm";
import { formatCurrency } from "@/lib/utils";
import { Info, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardCropsProps {
  farmData: FarmData;
}

const DashboardCrops = ({ farmData }: DashboardCropsProps) => {
  // Use market prices data if available, otherwise display N/A
  const marketPrices = farmData.marketPrices
    ? Object.fromEntries(farmData.marketPrices.map(price => [price.culture, price.price]))
    : {};
  
  // Average yield calculation by culture
  const averageYields = farmData.marketPrices
    ? Object.fromEntries(farmData.marketPrices.map(price => [price.culture, price.averageYield]))
    : {};
  
  // Check if the cultures have the required data
  const isValidCultures = farmData.cultures && farmData.cultures.length > 0;
  
  // Current year if not specified
  const displayYear = farmData.year || new Date().getFullYear().toString();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Növénykultúrák</CardTitle>
            <CardDescription>
              {farmData.applicantName 
                ? `${farmData.applicantName} - ${farmData.documentId || "N/A"}`
                : `SAPS dokumentum alapján rögzített növénykultúrák - ${farmData.documentId || "N/A"}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700">
            <Calendar className="h-3.5 w-3.5" />
            {displayYear}. évi adatok
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isValidCultures ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kultúra</TableHead>
                  <TableHead className="text-right">Terület (ha)</TableHead>
                  <TableHead className="text-right">Várható hozam (t/ha)</TableHead>
                  <TableHead className="text-right">Piaci ár (Ft/tonna)</TableHead>
                  <TableHead className="text-right">Becsült bevétel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {farmData.cultures.map((culture, idx) => {
                  const price = marketPrices[culture.name] || "N/A";
                  const yield_per_ha = averageYields[culture.name] || "N/A";
                  
                  return (
                    <TableRow key={idx}>
                      <TableCell>{culture.name || "N/A"}</TableCell>
                      <TableCell className="text-right">
                        {typeof culture.hectares === 'number' 
                          ? culture.hectares.toFixed(2).replace('.', ',') 
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">{yield_per_ha}</TableCell>
                      <TableCell className="text-right">
                        {typeof price === 'number' ? formatCurrency(price) : price}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof culture.estimatedRevenue === 'number' 
                          ? formatCurrency(culture.estimatedRevenue) 
                          : "N/A"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="font-medium">Összesen</TableCell>
                  <TableCell className="text-right font-medium">
                    {typeof farmData.hectares === 'number' 
                      ? farmData.hectares.toFixed(2).replace('.', ',') + " ha" 
                      : "N/A"}
                  </TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right font-medium">
                    {typeof farmData.totalRevenue === 'number' 
                      ? formatCurrency(farmData.totalRevenue) 
                      : "N/A"}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
            
            {farmData.blockIds && farmData.blockIds.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info size={16} className="text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Blokkazonosítók:</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {farmData.blockIds.map((id, index) => (
                    <Badge key={index} variant="outline" className="bg-blue-50">
                      {id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nem található érvényes növénykultúra adat.</p>
            <p className="text-sm mt-2">Kérjük, töltsön fel egy SAPS dokumentumot a részletes adatok megjelenítéséhez.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardCrops;
