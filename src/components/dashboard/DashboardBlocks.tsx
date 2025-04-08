
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/types/farm";
import { Badge } from "@/components/ui/badge";
import { Info, Blocks, Calendar } from "lucide-react";

interface DashboardBlocksProps {
  farmData: FarmData;
}

const DashboardBlocks = ({ farmData }: DashboardBlocksProps) => {
  // Check for valid block IDs data
  const isValidBlocks = farmData.blockIds && farmData.blockIds.length > 0;
  
  // Group block IDs into rows of 5 for better display
  const blockRows: string[][] = [];
  if (isValidBlocks) {
    for (let i = 0; i < farmData.blockIds.length; i += 5) {
      blockRows.push(farmData.blockIds.slice(i, i + 5));
    }
  }
  
  // Current year if not specified
  const displayYear = farmData.year || new Date().getFullYear().toString();
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Blokkazonosítók</CardTitle>
            <CardDescription>
              {farmData.applicantName && farmData.applicantName !== "N/A" 
                ? `${farmData.applicantName} - ${farmData.documentId || "N/A"}`
                : `SAPS dokumentum alapján rögzített blokkazonosítók - ${farmData.documentId || "N/A"}`}
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700">
            <Calendar className="h-3.5 w-3.5" />
            {displayYear !== "N/A" ? `${displayYear}. évi adatok` : "Aktuális évi adatok"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isValidBlocks ? (
          <>
            <div className="mb-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Blocks className="h-4 w-4" />
                <span className="text-sm font-medium">Összesen {farmData.blockIds.length} blokkazonosító</span>
              </div>
            </div>
            
            <div className="grid gap-4">
              {blockRows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex flex-wrap gap-2">
                  {row.map((blockId, idx) => (
                    <Badge 
                      key={`${rowIndex}-${idx}`} 
                      variant="outline" 
                      className="bg-blue-50 text-blue-700 py-1 px-3"
                    >
                      {blockId}
                    </Badge>
                  ))}
                </div>
              ))}
            </div>
            
            {farmData.hectares && (
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Blokkok összesített mérete:</span>
                  <span className="font-medium">
                    {typeof farmData.hectares === 'number' 
                      ? farmData.hectares.toFixed(2).replace('.', ',') + " ha" 
                      : "N/A"}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Nem található érvényes blokkazonosító adat.</p>
            <p className="text-sm mt-2">Kérjük, töltsön fel egy SAPS dokumentumot a részletes adatok megjelenítéséhez.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DashboardBlocks;
