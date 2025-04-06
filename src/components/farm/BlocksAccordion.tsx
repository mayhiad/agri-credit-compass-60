
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/components/LoanApplication";
import { Layers, Info } from "lucide-react";

interface BlocksAccordionProps {
  farmData: FarmData;
}

export const BlocksAccordion = ({ farmData }: BlocksAccordionProps) => {
  if (!farmData || !farmData.blockIds || farmData.blockIds.length === 0) {
    return null;
  }
  
  return (
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
      
      {farmData.parcels && farmData.parcels.length > 0 && (
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
                      <TableCell className="text-right">{parcel.hectares ? parcel.hectares.toFixed(2) : "0.00"}</TableCell>
                      <TableCell>{parcel.location?.settlement || "Ismeretlen"}</TableCell>
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
                      <TableCell className="text-right">{price.averageYield ? price.averageYield.toFixed(1) : "0.0"}</TableCell>
                      <TableCell className="text-right">{price.price ? price.price.toLocaleString() : "0"} Ft</TableCell>
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
  );
};

export default BlocksAccordion;
