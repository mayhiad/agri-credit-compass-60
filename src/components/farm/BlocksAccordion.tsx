import { FarmData } from "@/types/farm";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Circle, MapPin } from "lucide-react";
import { formatNumber } from "@/lib/utils";

interface BlocksAccordionProps {
  farmData: FarmData;
}

export const BlocksAccordion = ({ farmData }: BlocksAccordionProps) => {
  // Create a default if blockIds is not available
  const blockIds = farmData.blockIds || [];
  
  if (blockIds.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            Nincs elérhető blokkazonosító információ.
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="blocks">
        <AccordionTrigger>
          <div className="flex items-center">
            <MapPin className="h-5 w-5 mr-2 text-blue-500" />
            <span>Blokkazonosítók ({blockIds.length} blokk)</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Blokkazonosító</TableHead>
                <TableHead className="text-right">Terület (ha)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {blockIds.map((blockId, index) => (
                <TableRow key={index}>
                  <TableCell className="flex items-center">
                    <Circle className="h-3 w-3 mr-2 text-green-500" />
                    {blockId}
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Since we don't have size data in the current model, showing a placeholder */}
                    {formatNumber(10.5, 2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default BlocksAccordion;
