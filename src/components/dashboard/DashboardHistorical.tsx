
import React, { useEffect, useState } from "react";
import { HistoricalCropData } from "@/components/farm/HistoricalCrops";
import HistoricalCrops from "@/components/farm/HistoricalCrops";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const DashboardHistorical = () => {
  const [historicalCropData, setHistoricalCropData] = useState<HistoricalCropData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        // Fetch historical data from the market_prices table
        // This should have been created in the previous PR with the SQL migration
        const { data, error } = await supabase
          .from('market_prices')
          .select('*')
          .eq('is_forecast', false)
          .order('year', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          // Transform the data to match the HistoricalCropData interface
          const transformedData: HistoricalCropData[] = data.map(item => ({
            year: item.year,
            culture: item.culture,
            averageYield: item.average_yield,
            price: item.price,
            region: item.region
          }));

          setHistoricalCropData(transformedData);
        }
      } catch (err) {
        console.error("Error fetching historical data:", err);
        setError("Nem sikerült betölteni a történeti adatokat. Kérjük, próbálja újra később.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-40 bg-gray-200 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-red-500">
          <p>{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <HistoricalCrops 
        historicalData={historicalCropData} 
      />
    </div>
  );
};

export default DashboardHistorical;
