
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { CircleDollarSign, TrendingUp, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CreditOfferCardProps {
  totalRevenue: number;
  approvedAmount?: number; // Megítélhető hitelösszeg
  currentYear?: string;
}

const CreditOfferCard = ({ totalRevenue, approvedAmount, currentYear = new Date().getFullYear().toString() }: CreditOfferCardProps) => {
  const navigate = useNavigate();
  
  // Kiszámoljuk a megítélhető hitelösszeget (ha nincs explicit megadva)
  const calculatedAmount = approvedAmount || Math.round(totalRevenue * 0.2);
  
  const handleApplyClick = () => {
    // Navigate to loan application page with the pre-approved amount in state
    navigate("/loan-application", { 
      state: { 
        preApprovedAmount: calculatedAmount,
        totalRevenue: totalRevenue
      }
    });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <CircleDollarSign className="h-5 w-5 text-primary" />
          Hitelajánlat
        </CardTitle>
        <CardDescription>
          Előminősített ajánlat a gazdasági adatok alapján
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Számított éves árbevétel</div>
            <div className="font-medium">{formatCurrency(totalRevenue)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {currentYear}. évi adatok
            </div>
            <div className="font-medium text-primary flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Előminősítve
            </div>
          </div>
          <div className="my-6">
            <div className="text-sm text-muted-foreground mb-1">Igényelhető hitelkeret</div>
            <div className="text-3xl font-bold text-primary">{formatCurrency(calculatedAmount)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              Az éves bevétel 20%-áig terjedő összeg
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleApplyClick} className="w-full">
          Hitelkérelem indítása
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreditOfferCard;
