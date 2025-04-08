
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FarmData } from "@/types/farm";
import { formatNumber } from "@/lib/utils";
import { MapPin } from "lucide-react";

interface BlocksAccordionProps {
  farmData: FarmData;
}

export const BlocksAccordion = ({ farmData }: BlocksAccordionProps) => {
  if (!farmData.blockIds || farmData.blockIds.length === 0) {
    return (
      <div className="text-center p-4 bg-muted/20 rounded-md">
        <p className="text-muted-foreground">Nem található blokkazonosító információ.</p>
      </div>
    );
  }

  // Convert blockIds to blocks with size if we need to support the new format that includes size
  // This handles both the new format where blockIds is array of objects, and old format where it's array of strings
  const hasDetailedBlocks = farmData.blockIds[0] && typeof farmData.blockIds[0] === 'object' && 'id' in farmData.blockIds[0];
  
  // Function to determine if we should group blocks (if we have more than 10)
  const shouldGroupBlocks = farmData.blockIds.length > 10;
  
  // Create a map for counties/regions
  const countyPrefixes: Record<string, string> = {
    'BAR': 'Baranya',
    'BEK': 'Békés',
    'BAC': 'Bács-Kiskun',
    'BOR': 'Borsod-Abaúj-Zemplén',
    'CSO': 'Csongrád-Csanád',
    'FEJ': 'Fejér',
    'GYM': 'Győr-Moson-Sopron',
    'HAJ': 'Hajdú-Bihar',
    'HEV': 'Heves',
    'JNS': 'Jász-Nagykun-Szolnok',
    'KOM': 'Komárom-Esztergom',
    'NOG': 'Nógrád',
    'PES': 'Pest',
    'SOM': 'Somogy',
    'SZB': 'Szabolcs-Szatmár-Bereg',
    'TOL': 'Tolna',
    'VAS': 'Vas',
    'VES': 'Veszprém',
    'ZAL': 'Zala'
  };
  
  // Group blocks by county if needed
  const groupedBlocks: Record<string, any[]> = {};
  
  if (shouldGroupBlocks) {
    farmData.blockIds.forEach((block) => {
      // Get the first three characters of the block ID (or the ID field if it's an object)
      const blockId = hasDetailedBlocks ? (block as any).id : block as string;
      const prefix = blockId.substring(0, 3);
      const county = countyPrefixes[prefix] || 'Egyéb';
      
      if (!groupedBlocks[county]) {
        groupedBlocks[county] = [];
      }
      
      groupedBlocks[county].push(block);
    });
  }

  return (
    <div className="space-y-4">
      {shouldGroupBlocks ? (
        <Accordion type="single" collapsible className="w-full">
          {Object.entries(groupedBlocks).map(([county, blocks], index) => (
            <AccordionItem key={index} value={`county-${index}`}>
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{county}</span>
                  <Badge variant="outline" className="ml-2">
                    {blocks.length} blokk
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {blocks.map((block, blockIndex) => {
                    const blockId = hasDetailedBlocks ? (block as any).id : block as string;
                    const blockSize = hasDetailedBlocks ? (block as any).size : null;
                    
                    return (
                      <Card key={blockIndex} className="overflow-hidden bg-muted/5">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {blockId}
                          </CardTitle>
                        </CardHeader>
                        {blockSize && (
                          <CardContent className="p-3 pt-0">
                            <p className="text-sm text-muted-foreground">
                              Méret: {formatNumber(blockSize, 4)} ha
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {farmData.blockIds.map((block, index) => {
            const blockId = hasDetailedBlocks ? (block as any).id : block as string;
            const blockSize = hasDetailedBlocks ? (block as any).size : null;
            
            return (
              <Card key={index} className="overflow-hidden bg-muted/5">
                <CardHeader className="p-3 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {blockId}
                  </CardTitle>
                </CardHeader>
                {blockSize && (
                  <CardContent className="p-3 pt-0">
                    <p className="text-sm text-muted-foreground">
                      Méret: {formatNumber(blockSize, 4)} ha
                    </p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BlocksAccordion;
