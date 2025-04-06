import React from "react";
import { HistoricalCropData } from "@/components/farm/HistoricalCrops";
import HistoricalCrops from "@/components/farm/HistoricalCrops";

// Rest of the component remains the same...
const DashboardHistorical = ({ historicalCropData }: { historicalCropData: HistoricalCropData[] }) => {
  return (
    <div>
      <HistoricalCrops 
        historicalData={historicalCropData} 
      />
    </div>
  );
};

export default DashboardHistorical;
