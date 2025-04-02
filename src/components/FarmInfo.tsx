
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/components/LoanApplication";
import { ArrowRight, CheckCircle, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface FarmInfoProps {
  farmData: FarmData;
  onComplete: () => void;
}

export const FarmInfo = ({ farmData }: FarmInfoProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <span className="text-muted-foreground">{farmData.region}</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Összes terület</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{farmData.hectares} ha</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Kultúrák</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{farmData.cultures.length} db</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Éves árbevétel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(farmData.totalRevenue)}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const FarmInfoDisplay = ({ farmData, onComplete }: FarmInfoProps) => {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Gazdasági adatok</CardTitle>
        <CardDescription>
          Ellenőrizze a SAPS dokumentum alapján kinyert adatokat
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FarmInfo farmData={farmData} onComplete={onComplete} />
        
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
                  <TableCell className="text-right">{culture.hectares}</TableCell>
                  <TableCell className="text-right">{formatCurrency(culture.estimatedRevenue)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Összesen</TableCell>
                <TableCell className="text-right font-medium">{farmData.hectares} ha</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(farmData.totalRevenue)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        <div className="bg-muted p-4 rounded-md">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>SAPS dokumentum azonosító: <span className="font-medium">{farmData.documentId}</span></span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onComplete} className="w-full">
          Adatok megerősítése
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

export default FarmInfoDisplay;
