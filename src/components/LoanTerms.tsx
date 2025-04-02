
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface LoanTermsProps {
  approvedAmount: number;
  onSubmit: (loanSettings: LoanSettings) => void;
}

export interface LoanSettings {
  amount: number;
  duration: number; // months
  paymentFrequency: "quarterly" | "biannual" | "annual";
  apr: number;
}

export const LoanTerms = ({ approvedAmount, onSubmit }: LoanTermsProps) => {
  const [amount, setAmount] = useState(approvedAmount);
  const [duration, setDuration] = useState(12); // default 12 months (1 year)
  const [paymentFrequency, setPaymentFrequency] = useState<"quarterly" | "biannual" | "annual">("annual");
  
  // APR calculation based on payment frequency
  const getAPR = (frequency: string): number => {
    switch (frequency) {
      case "quarterly": return 16;
      case "biannual": return 17;
      case "annual": return 18;
      default: return 18;
    }
  };
  
  const apr = getAPR(paymentFrequency);
  
  // Calculate payment info
  const getNumberOfPayments = (): number => {
    switch (paymentFrequency) {
      case "quarterly": return duration / 3;
      case "biannual": return duration / 6;
      case "annual": return duration / 12;
      default: return 1;
    }
  };
  
  const numberOfPayments = getNumberOfPayments();
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

  const getPaymentFrequencyText = () => {
    switch (paymentFrequency) {
      case "quarterly": return "negyedév";
      case "biannual": return "félév";
      case "annual": return "év";
      default: return "";
    }
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Kölcsön feltételek</CardTitle>
        <CardDescription>
          Válassza ki a kölcsön összegét, futamidejét és törlesztési feltételeit
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
        
        <div className="space-y-2">
          <Label htmlFor="duration">Futamidő</Label>
          <Select 
            value={String(duration)} 
            onValueChange={(value) => setDuration(Number(value))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Válasszon futamidőt" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 hónap</SelectItem>
              <SelectItem value="6">6 hónap</SelectItem>
              <SelectItem value="12">1 év</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-3">
          <Label>Törlesztési gyakoriság</Label>
          <RadioGroup 
            value={paymentFrequency} 
            onValueChange={(value: "quarterly" | "biannual" | "annual") => setPaymentFrequency(value)}
            className="grid grid-cols-1 gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="quarterly" id="quarterly" />
              <Label htmlFor="quarterly" className="flex items-center gap-1.5 cursor-pointer">
                <Calendar className="h-4 w-4" />
                <span>Negyedéves törlesztés</span>
                <span className="text-xs text-green-600 font-semibold ml-1">(16% THM)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="biannual" id="biannual" />
              <Label htmlFor="biannual" className="flex items-center gap-1.5 cursor-pointer">
                <CalendarClock className="h-4 w-4" />
                <span>Féléves törlesztés</span>
                <span className="text-xs text-amber-600 font-semibold ml-1">(17% THM)</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="annual" id="annual" />
              <Label htmlFor="annual" className="flex items-center gap-1.5 cursor-pointer">
                <CalendarClock className="h-4 w-4" />
                <span>Éves törlesztés</span>
                <span className="text-xs text-red-600 font-semibold ml-1">(18% THM)</span>
              </Label>
            </div>
          </RadioGroup>
        </div>
        
        <div className="pt-4 border-t">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>THM:</span>
              <span className="font-medium">{apr}%</span>
            </div>
            <div className="flex justify-between">
              <span>Futamidő:</span>
              <span className="font-medium">{duration === 12 ? '1 év' : `${duration} hónap`}</span>
            </div>
            <div className="flex justify-between">
              <span>Törlesztőrészlet:</span>
              <span className="font-medium">{formatCurrency(paymentAmount)}/{getPaymentFrequencyText()}</span>
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
