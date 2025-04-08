
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, UserIcon, UserCheck, Calendar } from "lucide-react";

interface SubmitterInfoProps {
  submitterName: string;
  submitterId: string;
  applicantId: string;
  submissionDate: string;
  year?: string;
}

const SubmitterInfo = ({ submitterName, submitterId, applicantId, submissionDate, year }: SubmitterInfoProps) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <UserIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Kérelmező neve</p>
              <p className="font-medium">{submitterName}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Ügyfél-azonosító</p>
              <p className="font-medium">{submitterId}</p>
            </div>
          </div>
          
          {applicantId !== submitterId && (
            <div className="flex items-start gap-3">
              <UserCheck className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Igénylő azonosító</p>
                <p className="font-medium">{applicantId}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <CalendarIcon className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Benyújtás dátuma</p>
              <p className="font-medium">{submissionDate}</p>
            </div>
          </div>
          
          {year && (
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Tárgyév</p>
                <p className="font-medium">{year}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubmitterInfo;
