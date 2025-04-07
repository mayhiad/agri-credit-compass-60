
import { UserData } from "@/components/LoanApplication";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Download, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Link } from "react-router-dom";

interface LoanCompleteProps {
  userData?: UserData;
  loanAmount: number;
  paymentFrequency: string;
}

const LoanComplete = ({ userData, loanAmount, paymentFrequency }: LoanCompleteProps) => {
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <CheckCircle className="h-12 w-12 text-green-500" />
        </div>
        <CardTitle>Sikeres hiteligénylés!</CardTitle>
        <CardDescription>
          A hiteligénylési folyamat sikeresen befejeződött.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg text-center">
            <h3 className="text-lg font-medium mb-1">Jóváhagyott hitelösszeg</h3>
            <p className="text-3xl font-bold text-green-700">{formatCurrency(loanAmount)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Igénylő neve</p>
              <p className="font-medium">{userData?.firstName} {userData?.lastName || 'N/A'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400" />
              <div>
                <p className="text-sm text-slate-500">Fizetési gyakoriság</p>
                <p className="font-medium">{paymentFrequency === 'monthly' ? 'Havi' : 'Éves'}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col gap-3 pt-4">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Szerződés letöltése
          </Button>
          <Link to="/dashboard" className="w-full">
            <Button className="w-full">
              Irányítópult megtekintése
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default LoanComplete;
