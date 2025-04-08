
import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Map } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface BlocksAccordionProps {
  blockIds: string[];
}

const BlocksAccordion: React.FC<BlocksAccordionProps> = ({ blockIds }) => {
  if (!blockIds || blockIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="h-5 w-5 text-primary" />
            Blokkazonosítók
          </CardTitle>
          <CardDescription>
            Nem található blokkazonosító a dokumentumban
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            A dokumentumban nem sikerült blokkazonosítókat felismerni, vagy nem tartalmazott ilyeneket.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Map className="h-5 w-5 text-primary" />
          Blokkazonosítók
        </CardTitle>
        <CardDescription>
          A gazdaság földterületeinek blokkazonosítói 
          ({blockIds.length} db)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {blockIds.map((blockId, index) => (
            <AccordionItem key={blockId} value={blockId}>
              <AccordionTrigger className="hover:no-underline px-4 py-2 font-medium">
                <div className="flex items-center space-x-2 text-left">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{blockId}</span>
                  <Badge variant="outline" className="ml-2">Blokk {index + 1}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3 pt-1">
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium">Blokkazonosító</p>
                    <p className="text-sm text-muted-foreground font-mono">{blockId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Státusz</p>
                    <p className="text-sm text-muted-foreground">Aktív</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Területi adatok</p>
                    <p className="text-sm text-muted-foreground">
                      A pontos területi adatok a MePAR rendszerből lekérdezhetők a blokkazonosító alapján.
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default BlocksAccordion;
