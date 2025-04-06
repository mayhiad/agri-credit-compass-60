
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, EuroIcon, Coins } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface CurrentYearRevenueProps {
  cultures: { name: string; hectares: number; estimatedRevenue: number }[];
  totalRevenue: number;
}

const CurrentYearRevenue = ({ cultures, totalRevenue }: CurrentYearRevenueProps) => {
  const [exchangeRate, setExchangeRate] = useState(390);
  const [isLoading, setIsLoading] = useState(false);
  const [revenueEur, setRevenueEur] = useState(totalRevenue / exchangeRate);

  // Fetch the latest exchange rate
  const fetchExchangeRate = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would be an API call to get the current exchange rate
      // For now, we'll simulate a delay and use a fixed rate
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Simulating a "real" exchange rate with some variation
      const newRate = 390 + (Math.random() * 10 - 5);
      setExchangeRate(newRate);
      setRevenueEur(totalRevenue / newRate);
    } catch (error) {
      console.error("Error fetching exchange rate:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Calculate the revenue in EUR based on the exchange rate
    setRevenueEur(totalRevenue / exchangeRate);
  }, [totalRevenue, exchangeRate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Idei év várható árbevétele</CardTitle>
        <CardDescription>
          Az aktuális HUF/EUR árfolyamon számított várható bevételek
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6">
          <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="w-full md:w-1/3">
              <Label htmlFor="exchange-rate">HUF/EUR árfolyam</Label>
              <div className="flex mt-2">
                <Input
                  id="exchange-rate"
                  type="number"
                  value={exchangeRate.toFixed(2)}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 390)}
                  step="0.01"
                  min="300"
                  max="450"
                />
                <Button 
                  variant="outline"
                  className="ml-2" 
                  onClick={fetchExchangeRate}
                  disabled={isLoading}
                >
                  {isLoading ? "Frissítés..." : "Frissítés"}
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-blue-50 p-4 rounded-md flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center">
                <EuroIcon className="h-6 w-6 mr-2 text-blue-600" />
                <span className="text-sm font-medium">Várható teljes árbevétel EUR-ban:</span>
              </div>
              <span className="text-2xl font-bold">{Math.round(revenueEur).toLocaleString()} EUR</span>
            </div>
          </div>

          <div className="mt-4">
            <h3 className="text-lg font-medium mb-4">Növénykultúránkénti bevétel becslés</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Kultúra</th>
                    <th className="text-right py-2">Terület (ha)</th>
                    <th className="text-right py-2">Becsült bevétel (HUF)</th>
                    <th className="text-right py-2">Becsült bevétel (EUR)</th>
                  </tr>
                </thead>
                <tbody>
                  {cultures.map((culture, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-3">{culture.name}</td>
                      <td className="text-right py-3">{culture.hectares.toFixed(2)}</td>
                      <td className="text-right py-3">{formatCurrency(culture.estimatedRevenue)}</td>
                      <td className="text-right py-3">
                        {Math.round(culture.estimatedRevenue / exchangeRate).toLocaleString()} EUR
                      </td>
                    </tr>
                  ))}
                  <tr className="font-medium bg-gray-50">
                    <td className="py-3">Összesen</td>
                    <td className="text-right py-3">
                      {cultures.reduce((sum, c) => sum + c.hectares, 0).toFixed(2)}
                    </td>
                    <td className="text-right py-3">{formatCurrency(totalRevenue)}</td>
                    <td className="text-right py-3">{Math.round(revenueEur).toLocaleString()} EUR</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-muted-foreground">
              <strong>Megjegyzés:</strong> Az EUR árfolyam napközben változhat, a feltüntetett adatok csak becslések. 
              A "Frissítés" gombra kattintva lekérhető az aktuális árfolyam.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentYearRevenue;
