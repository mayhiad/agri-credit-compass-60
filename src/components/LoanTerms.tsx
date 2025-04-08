
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowRight, Calendar, CalendarClock, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

interface LoanTermsProps {
  approvedAmount?: number;
  onComplete: () => void;
  onSubmit?: (loanSettings: LoanSettings) => void;
}

export interface LoanSettings {
  amount: number;
  duration: number; // months
  paymentFrequency: "quarterly" | "biannual" | "annual";
  apr: number;
  totalRepayment: number;
}

export const LoanTerms = ({ approvedAmount = 1000000, onComplete, onSubmit }: LoanTermsProps) => {
  const [amount, setAmount] = useState(approvedAmount);
  const [duration, setDuration] = useState(12); // default 12 months (1 year)
  const [paymentFrequency, setPaymentFrequency] = useState<"quarterly" | "biannual" | "annual">("quarterly");
  
  // Set up min, max, and step values for the slider
  const minAmount = 100000; // Minimum loan amount
  const maxAmount = approvedAmount; // Maximum is the approved amount
  const step = 100000; // 100,000 Ft increments

  // Adjust amount to fit step increments on component mount
  useEffect(() => {
    // Round to nearest step
    const roundedAmount = Math.round(approvedAmount / step) * step;
    setAmount(roundedAmount);
  }, [approvedAmount, step]);
  
  // Validate and update payment frequency when duration changes
  useEffect(() => {
    // If duration is less than payment frequency, adjust payment frequency
    if (duration === 3 && (paymentFrequency === "biannual" || paymentFrequency === "annual")) {
      setPaymentFrequency("quarterly");
    } else if (duration === 6 && paymentFrequency === "annual") {
      setPaymentFrequency("biannual");
    }
  }, [duration, paymentFrequency]);
  
  // Handle slider value change
  const handleSliderChange = (value: number[]) => {
    setAmount(value[0]);
  };

  // Manual amount adjustment with buttons
  const decreaseAmount = () => {
    if (amount - step >= minAmount) {
      setAmount(amount - step);
    }
  };

  const increaseAmount = () => {
    if (amount + step <= approvedAmount) {
      setAmount(amount + step);
    }
  };
  
  // APR calculation based on payment frequency
  const getAPR = (frequency: string): number => {
    switch (frequency) {
      case "quarterly": return 16;
      case "biannual": return 17;
      case "annual": return 18;
      default: return 16;
    }
  };
  
  const apr = getAPR(paymentFrequency);
  
  // Calculate payment info
  const getNumberOfPayments = (): number => {
    switch (paymentFrequency) {
      case "quarterly": return Math.floor(duration / 3);
      case "biannual": return Math.floor(duration / 6);
      case "annual": return Math.floor(duration / 12);
      default: return 1;
    }
  };
  
  const numberOfPayments = getNumberOfPayments();
  
  // Calculate total repayment amount
  const calculateTotalRepayment = (principal: number, annualInterestRate: number, durationMonths: number): number => {
    // Convert annual rate to decimal and adjust for the period
    const rate = annualInterestRate / 100;
    // Calculate interest
    const interest = principal * rate * (durationMonths / 12);
    // Total repayment is principal plus interest
    return principal + interest;
  };
  
  const totalRepayment = calculateTotalRepayment(amount, apr, duration);
  const paymentAmount = numberOfPayments > 0 ? Math.ceil(totalRepayment / numberOfPayments) : 0;

  const handleSubmit = () => {
    if (onSubmit) {
      onSubmit({
        amount,
        duration,
        paymentFrequency,
        apr,
        totalRepayment
      });
    }
    
    toast.success("Kölcsön feltételek kiválasztva");
    onComplete();
  };

  const getPaymentFrequencyText = () => {
    switch (paymentFrequency) {
      case "quarterly": return "negyedév";
      case "biannual": return "félév";
      case "annual": return "év";
      default: return "";
    }
  };

  // Check if payment frequency option should be disabled based on duration
  const isPaymentFrequencyDisabled = (frequency: "quarterly" | "biannual" | "annual"): boolean => {
    if (duration === 3) {
      return frequency === "biannual" || frequency === "annual";
    } else if (duration === 6) {
      return frequency === "annual";
    }
    return false;
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
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label htmlFor="loan-amount">Kölcsön összege</Label>
            <span className="text-xl font-semibold">{formatCurrency(amount)}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={decreaseAmount} 
              disabled={amount <= minAmount}
            >
              <Minus className="h-4 w-4" />
            </Button>
            
            <div className="flex-1">
              <Slider 
                value={[amount]}
                min={minAmount}
                max={maxAmount}
                step={step}
                onValueChange={handleSliderChange}
                className="my-2"
              />
            </div>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={increaseAmount} 
              disabled={amount >= approvedAmount}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
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
            <div className={`flex items-center space-x-2 ${isPaymentFrequencyDisabled("biannual") ? "opacity-50" : ""}`}>
              <RadioGroupItem 
                value="biannual" 
                id="biannual" 
                disabled={isPaymentFrequencyDisabled("biannual")} 
              />
              <Label htmlFor="biannual" className={`flex items-center gap-1.5 ${isPaymentFrequencyDisabled("biannual") ? "cursor-not-allowed" : "cursor-pointer"}`}>
                <CalendarClock className="h-4 w-4" />
                <span>Féléves törlesztés</span>
                <span className="text-xs text-amber-600 font-semibold ml-1">(17% THM)</span>
              </Label>
            </div>
            <div className={`flex items-center space-x-2 ${isPaymentFrequencyDisabled("annual") ? "opacity-50" : ""}`}>
              <RadioGroupItem 
                value="annual" 
                id="annual" 
                disabled={isPaymentFrequencyDisabled("annual")} 
              />
              <Label htmlFor="annual" className={`flex items-center gap-1.5 ${isPaymentFrequencyDisabled("annual") ? "cursor-not-allowed" : "cursor-pointer"}`}>
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
            <div className="flex justify-between pt-3 mt-3 border-t text-primary">
              <span className="font-semibold">Teljes visszafizetendő összeg:</span>
              <span className="font-bold">{formatCurrency(totalRepayment)}</span>
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

export default LoanTerms;
