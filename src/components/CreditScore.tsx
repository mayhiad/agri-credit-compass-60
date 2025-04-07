
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FarmData } from "@/types/farm";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, ArrowRight, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { useAuth } from "@/App";

interface CreditScoreProps {
  farmData: FarmData;
  creditLimit: number;
  onComplete: () => void;
}

export const CreditScore = ({ farmData, creditLimit, onComplete }: CreditScoreProps) => {
  const [calculating, setCalculating] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    // Simulate calculation time
    const timer = setTimeout(() => {
      setCalculating(false);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Hitelkeret megállapítása</CardTitle>
        <CardDescription>
          A SAPS dokumentumban szereplő adatok alapján az alábbi hitelkeret érhető el
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {calculating ? (
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 border-4 border-t-primary border-gray-200 rounded-full animate-spin mb-4"></div>
            <p className="text-lg font-medium">Hitelkeret kiszámítása...</p>
            <p className="text-sm text-gray-500">A gazdasági adatok feldolgozása folyamatban</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center justify-center py-6 bg-green-50 rounded-lg border border-green-200">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-lg text-green-800 font-medium">Hitelkeret megállapítva</p>
              <div className="text-3xl font-bold text-green-700 mt-2">
                {formatCurrency(creditLimit)}
              </div>
              <p className="text-sm text-gray-600 mt-2 text-center max-w-xs">
                A SAPS dokumentum alapján kalkulált éves árbevétel: {formatCurrency(farmData.totalRevenue)}
              </p>
            </div>
            
            <Alert className="bg-blue-50 border-blue-200">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <AlertDescription className="text-blue-700">
                  <span className="font-bold">Gyors folyamat</span>: Regisztráció után mindössze 10 percet vesz igénybe a hitelszerződés elkészítése, és a szerződéskötéstől számított 48 órán belül folyósítunk!
                </AlertDescription>
              </div>
            </Alert>
          </>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-3">
        {!calculating && (
          <>
            {user ? (
              <Button className="w-full" variant="default" onClick={() => onComplete()}>
                Folytatom a hiteligénylést
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Link to="/auth" className="w-full">
                  <Button className="w-full" variant="default">
                    Regisztrálok és igénylem a hitelt
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Button onClick={onComplete} variant="outline" className="w-full">
                  Folytatás regisztráció nélkül
                </Button>
              </>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
};

export default CreditScore;
