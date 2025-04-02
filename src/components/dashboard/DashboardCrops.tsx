
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/components/LoanApplication";
import { formatCurrency } from "@/lib/utils";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardCropsProps {
  farmData: FarmData;
}

const DashboardCrops = ({ farmData }: DashboardCropsProps) => {
  // Használjuk a marketPrices adatokat, ha rendelkezésre állnak
  const marketPrices = farmData.marketPrices
    ? Object.fromEntries(farmData.marketPrices.map(price => [price.culture, price.price]))
    : {
        "Búza": 85000,
        "Kukorica": 75000,
        "Napraforgó": 180000
      };
  
  // Átlagos hozam számítása kultúránként
  const averageYields = farmData.marketPrices
    ? Object.fromEntries(farmData.marketPrices.map(price => [price.culture, price.averageYield]))
    : {
        "Búza": 5.2,
        "Kukorica": 7.8,
        "Napraforgó": 2.9
      };
  
  // Ellenőrizzük, hogy a cultures rendelkezik-e a megfelelő adatokkal
  const isValidCultures = farmData.cultures && farmData.cultures.length > 0 && 
    farmData.cultures.every(c => typeof c.name === 'string' && 
    typeof c.hectares === 'number' && 
    typeof c.estimatedRevenue === 'number');
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Növénykultúrák</CardTitle>
        <CardDescription>
          A SAPS dokumentum alapján rögzített növénykultúrák - {farmData.documentId || ""}
        </CardDescription>
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
                  const price = marketPrices[culture.name] || 100000;
                  const yield_per_ha = averageYields[culture.name] || 4.5;
                  
                  return (
                    <TableRow key={idx}>
                      <TableCell>{culture.name}</TableCell>
                      <TableCell className="text-right">{culture.hectares}</TableCell>
                      <TableCell className="text-right">{yield_per_ha}</TableCell>
                      <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(culture.estimatedRevenue)}</TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="font-medium">Összesen</TableCell>
                  <TableCell className="text-right font-medium">{farmData.hectares} ha</TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(farmData.totalRevenue)}</TableCell>
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
