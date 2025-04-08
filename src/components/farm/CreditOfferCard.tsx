
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FarmData } from "@/types/farm";
import { BadgeCheck, TrendingUp, Calendar, ArrowRight } from "lucide-react";

export interface CreditOfferCardProps {
  farmData: FarmData;
  onApply: () => void;
}

const CreditOfferCard: React.FC<CreditOfferCardProps> = ({ farmData, onApply }) => {
  // Calculate credit limit based on total revenue
  const creditLimit = farmData.totalRevenue ? Math.round(farmData.totalRevenue * 0.7) : 0;
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('hu-HU', { 
      style: 'currency', 
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-primary">
          <BadgeCheck className="h-5 w-5" />
          Előminősített hitelajánlat
        </CardTitle>
        <CardDescription>
          A gazdasága alapján előminősített hitelajánlat
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Maximális hitelkeret</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(creditLimit)}</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Kamat</p>
                <p className="font-medium">9.9%</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Futamidő</p>
                <p className="font-medium">12-36 hónap</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={onApply} className="w-full">
          <span className="flex items-center gap-2">
            Hiteligénylés indítása
            <ArrowRight className="h-4 w-4" />
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CreditOfferCard;
