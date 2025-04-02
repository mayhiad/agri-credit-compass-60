
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";

interface LoanTermsProps {
  approvedAmount: number;
  onSubmit: (loanSettings: LoanSettings) => void;
}

export interface LoanSettings {
  amount: number;
  duration: number; // months
  paymentFrequency: "quarterly" | "biannual";
  apr: number;
}

export const LoanTerms = ({ approvedAmount, onSubmit }: LoanTermsProps) => {
  const [amount, setAmount] = useState(approvedAmount);
  const [duration, setDuration] = useState(12); // max 12 months (1 year)
  const [paymentFrequency, setPaymentFrequency] = useState<"quarterly" | "biannual">("biannual");
  
  // APR calculation - slightly lower for quarterly payments
  const baseAPR = 8.9;
  const apr = paymentFrequency === "quarterly" ? baseAPR - 0.5 : baseAPR;
  
  // Calculate payment info
  const numberOfPayments = paymentFrequency === "quarterly" ? 4 : 2;
  const paymentAmount = calculatePayment(amount, apr, numberOfPayments);
  
  const handleSubmit = () => {
    onSubmit({
      amount,
      duration,
      paymentFrequency,
      apr
    });
    toast.success("Kölcsön feltételek kiválasztva");
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Kölcsön feltételek</CardTitle>
        <CardDescription>
          Válassza ki a kölcsön összegét és törlesztési feltételeit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="loan-amount">Kölcsön összege</Label>
          <Input 
            id="loan-amount"
            type="number"
            min={100000}
            max={approvedAmount}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
          <p className="text-sm text-muted-foreground">
            Jóváhagyott hitelkeret: {formatCurrency(approvedAmount)}
          </p>
        </div>
        
        <div className="space-y-3">
          <Label>Törlesztési gyakoriság</Label>
          <RadioGroup 
            value={paymentFrequency} 
            onValueChange={(value: "quarterly" | "biannual") => setPaymentFrequency(value)}
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="quarterly" id="quarterly" />
              <Label htmlFor="quarterly" className="flex items-center gap-1.5 cursor-pointer">
                <Calendar className="h-4 w-4" />
                <span>Negyedéves törlesztés</span>
                <span className="text-xs text-green-600 font-semibold ml-1">(-0.5% THM)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="biannual" id="biannual" />
              <Label htmlFor="biannual" className="flex items-center gap-1.5 cursor-pointer">
                <CalendarClock className="h-4 w-4" />
                <span>Féléves törlesztés</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="pt-4 border-t">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>THM:</span>
              <span className="font-medium">{apr.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Futamidő:</span>
              <span className="font-medium">1 év</span>
            </div>
            <div className="flex justify-between">
              <span>Törlesztőrészlet:</span>
              <span className="font-medium">{formatCurrency(paymentAmount)}/{paymentFrequency === "quarterly" ? "negyedév" : "félév"}</span>
            </div>
            <div className="flex justify-between">
              <span>Törlesztések száma:</span>
              <span className="font-medium">{numberOfPayments}</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmit} className="w-full">
          Feltételek elfogadása
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

// Helper function for calculating payment amount
function calculatePayment(amount: number, apr: number, numberOfPayments: number): number {
  const interest = (apr / 100) * amount;
  const totalAmount = amount + interest;
  return Math.ceil(totalAmount / numberOfPayments);
}

export default LoanTerms;
