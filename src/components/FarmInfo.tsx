
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/components/LoanApplication";
import { ArrowRight, CheckCircle, MapPin, Layers, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

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
            <p className="text-3xl font-bold">{farmData.hectares.toFixed(2)} ha</p>
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
              {farmData.cultures && farmData.cultures.map((culture, idx) => (
                <TableRow key={idx}>
                  <TableCell>{culture.name}</TableCell>
                  <TableCell className="text-right">{culture.hectares.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(culture.estimatedRevenue)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Összesen</TableCell>
                <TableCell className="text-right font-medium">{farmData.hectares.toFixed(2)} ha</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(farmData.totalRevenue)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        
        {/* Blokkazonosítók és részletes adatok */}
        {farmData.blockIds && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="blocks">
              <AccordionTrigger className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span>Blokkazonosítók ({farmData.blockIds.length} db)</span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2 p-2">
                  {farmData.blockIds.map((blockId, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {blockId}
                    </Badge>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
            
            {farmData.parcels && (
              <AccordionItem value="parcels">
                <AccordionTrigger className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span>Részletes parcella adatok ({farmData.parcels.length} db)</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Blokk ID</TableHead>
                          <TableHead>Parcella</TableHead>
                          <TableHead>Kultúra</TableHead>
                          <TableHead className="text-right">Terület (ha)</TableHead>
                          <TableHead>Település</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {farmData.parcels.map((parcel, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{parcel.blockId}</TableCell>
                            <TableCell>{parcel.parcelId}</TableCell>
                            <TableCell>{parcel.culture}</TableCell>
                            <TableCell className="text-right">{parcel.hectares.toFixed(2)}</TableCell>
                            <TableCell>{parcel.location.settlement}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
            
            {farmData.marketPrices && farmData.marketPrices.length > 0 && (
              <AccordionItem value="prices">
                <AccordionTrigger className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span>Aktuális piaci árak</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kultúra</TableHead>
                          <TableHead className="text-right">Átlagos termésátlag (t/ha)</TableHead>
                          <TableHead className="text-right">Piaci ár (Ft/t)</TableHead>
                          <TableHead>Trend</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {farmData.marketPrices.map((price, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{price.culture}</TableCell>
                            <TableCell className="text-right">{price.averageYield.toFixed(1)}</TableCell>
                            <TableCell className="text-right">{price.price.toLocaleString()} Ft</TableCell>
                            <TableCell>
                              {price.trend > 0 ? (
                                <span className="text-green-600">↑ Növekvő</span>
                              ) : price.trend < 0 ? (
                                <span className="text-red-600">↓ Csökkenő</span>
                              ) : (
                                <span className="text-gray-600">→ Stabil</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        )}
        
        <div className="bg-muted p-4 rounded-md space-y-2">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>SAPS dokumentum azonosító: <span className="font-medium">{farmData.documentId}</span></span>
          </div>
          {farmData.applicantName && (
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Igénylő neve: <span className="font-medium">{farmData.applicantName}</span></span>
            </div>
          )}
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
