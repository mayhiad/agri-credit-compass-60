
import { FarmData } from "@/types/farm";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Pin, Info } from "lucide-react";
import { ParcelData } from "@/services/sapsProcessor";

interface BlocksAccordionProps {
  farmData: FarmData;
}

const BlocksAccordion = ({ farmData }: BlocksAccordionProps) => {
  // If there are no block IDs, return null
  if (!farmData.blockIds || farmData.blockIds.length === 0) {
    return null;
  }

  // Create a default parcels array if not provided
  const parcels: ParcelData[] = farmData.parcels || farmData.blockIds.map((blockId, index) => ({
    id: `parcel-${index}`,
    blockId: blockId,
    area: farmData.hectares / farmData.blockIds.length,
    location: "Ismeretlen helyszín",
    cultures: farmData.cultures.slice(0, 2).map(c => c.name)
  }));
  
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Pin className="h-4 w-4 text-primary" />
          Blokkazonosítók és területek
        </CardTitle>
        <CardDescription>
          A SAPS dokumentumban azonosított területek és blokkok
        </CardDescription>
      </CardHeader>
      <CardContent>
        {farmData.blockIds.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nem találhatók blokkazonosítók a dokumentumban.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {parcels.map((parcel, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="py-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-50">{parcel.blockId}</Badge>
                    <span className="text-sm">
                      {parcel.area.toFixed(1).replace('.', ',')} ha
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{parcel.location}</span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Növénykultúrák:</span>
                      </div>
                      <div className="flex flex-wrap gap-1 ml-6">
                        {parcel.cultures.map((culture, idx) => (
                          <Badge key={idx} variant="outline" className="bg-green-50 text-green-700">
                            {culture}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default BlocksAccordion;
