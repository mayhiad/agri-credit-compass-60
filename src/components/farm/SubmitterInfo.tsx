
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface SubmitterInfoProps {
  submitterName?: string;
  submitterId?: string;
  applicantId?: string;
  submissionDate?: string;
  documentId?: string;
  documentYear?: string;
}

export const SubmitterInfo = ({ 
  submitterName, 
  submitterId, 
  applicantId, 
  submissionDate,
  documentId,
  documentYear
}: SubmitterInfoProps) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Beadó neve</Label>
          <div className="font-medium">{submitterName || "N/A"}</div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Beadó ügyfél-azonosító száma</Label>
          <div className="font-medium">{submitterId || "N/A"}</div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Kérelmező ügyfél-azonosító száma</Label>
          <div className="font-medium">{applicantId || "N/A"}</div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Iratazonosító</Label>
          <div className="font-medium">{documentId || "N/A"}</div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Egységes kérelem beadásának időpontja</Label>
          <div className="font-medium">{submissionDate || "N/A"}</div>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Meghatározott tárgyév</Label>
          <div className="font-medium">{documentYear || new Date().getFullYear().toString()}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmitterInfo;
