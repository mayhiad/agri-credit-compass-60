
import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FarmData } from "@/components/LoanApplication";
import { ArrowRight, Check } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface CreditScoreProps {
  farmData: FarmData;
  creditLimit: number;
  onComplete: () => void;
}

export const CreditScore = ({ farmData, creditLimit, onComplete }: CreditScoreProps) => {
  const [loading, setLoading] = useState(false);
  
  const handleApprove = async () => {
    setLoading(true);
    
    // Mock credit check process
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    setLoading(false);
    toast.success("Hitelkeret jóváhagyva");
    onComplete();
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Hitelezési pontszám</CardTitle>
        <CardDescription>
          A gazdasági adatok alapján megállapított hitelkeret
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col items-center justify-center py-6 bg-green-50 rounded-lg">
          <div className="text-xs uppercase text-green-600 font-semibold mb-2">
            Jóváhagyott hitelkeret:
          </div>
          <div className="text-4xl font-bold text-green-700">
            {formatCurrency(creditLimit)}
          </div>
          <div className="text-sm text-green-600 mt-1">
            {farmData.hectares} hektár alapján
          </div>
        </div>
        
        <div className="space-y-4 py-2">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium">Éves bevétel</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {formatCurrency(farmData.totalRevenue)} éves árbevétel alapján
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium">Területalapú támogatás</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                SAPS dokumentációban szereplő adatok alapján 
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-medium">Mezőgazdasági kultúrák</h4>
              <p className="text-sm text-muted-foreground mt-0.5">
                {farmData.cultures.length} különböző növényi kultúra diverszifikáció
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleApprove}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Jóváhagyás folyamatban..." : (
            <>
              Hitelkeret elfogadása
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreditScore;
