
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, MapPin, Fingerprint } from "lucide-react";

interface SubmitterInfoProps {
  applicantName?: string;
  submitterId?: string;
  applicantId?: string;
  region?: string;
}

const SubmitterInfo: React.FC<SubmitterInfoProps> = ({ 
  applicantName = "N/A", 
  submitterId = "N/A",
  applicantId = "N/A", 
  region = "N/A" 
}) => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Beadó adatai
        </CardTitle>
        <CardDescription>
          Az egységes kérelem benyújtójának adatai
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Beadó neve</p>
            <p className="font-semibold">{applicantName}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Beadó ügyfél-azonosító száma</p>
            <p className="font-semibold flex items-center gap-1">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              {submitterId}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Kérelmező ügyfél-azonosító száma</p>
            <p className="font-semibold flex items-center gap-1">
              <Fingerprint className="h-4 w-4 text-muted-foreground" />
              {applicantId}
            </p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground">Régió / megye</p>
            <p className="font-semibold flex items-center gap-1">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {region}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmitterInfo;
