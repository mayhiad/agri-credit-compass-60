
import { Card, CardContent } from "@/components/ui/card";
import { User, Calendar, FileText, UserCheck } from "lucide-react";

interface SubmitterInfoProps {
  submitterName?: string | null;
  submitterId?: string | null;
  applicantId?: string | null;
  submissionDate?: string | null;
}

const SubmitterInfo = ({ 
  submitterName, 
  submitterId, 
  applicantId,
  submissionDate
}: SubmitterInfoProps) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Beadó neve:</div>
              <div className="font-semibold">
                {submitterName || "Nem elérhető"}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Beadó azonosítószáma:</div>
              <div className="font-semibold">
                {submitterId || "Nem elérhető"}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <div className="text-sm font-medium text-muted-foreground">Kérelmező azonosítószáma:</div>
              <div className="font-semibold">
                {applicantId || "Nem elérhető"}
              </div>
            </div>
          </div>

          {submissionDate && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-muted-foreground">Beadás időpontja:</div>
                <div className="font-semibold">
                  {submissionDate}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmitterInfo;
