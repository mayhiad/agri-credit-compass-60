
import { HistoricalCropData } from "@/components/farm/HistoricalCrops";
import HistoricalCrops from "@/components/farm/HistoricalCrops";
import { FarmData } from "@/components/LoanApplication";

interface DashboardHistoricalProps {
  farmData: FarmData;
}

// Sample historical data based on the image provided
const sampleHistoricalData: HistoricalCropData[] = [
  {
    id: "FOR01",
    name: "Lucerna",
    type: "Takarmánynövény",
    yearlyData: [
      { year: 2017, area: 0.58, yield: 3.00 },
      { year: 2018, area: 0.5852, yield: 2.70 },
      { year: 2019, area: 0.5852, yield: 1.90 },
      { year: 2020, area: 0.32, yield: 1.60 }
    ]
  },
  {
    id: "IND01",
    name: "Szójabab",
    type: "Ipari növény",
    yearlyData: [
      { year: 2016, area: 25.59, yield: 59.11 },
      { year: 2017, area: 32.83, yield: 37.53 }
    ]
  },
  {
    id: "IND03",
    name: "Őszi káposztarepce",
    type: "Ipari növény",
    yearlyData: [
      { year: 2018, area: 75.168, yield: 311.00 },
      { year: 2019, area: 99.1115, yield: 300.00 },
      { year: 2020, area: 62.06, yield: 180.00 }
    ]
  },
  {
    id: "IND23",
    name: "Napraforgó",
    type: "Ipari növény",
    yearlyData: [
      { year: 2016, area: 104.79, yield: 235.36 },
      { year: 2017, area: 84.32, yield: 176.50 },
      { year: 2018, area: 80.68, yield: 285.00 },
      { year: 2019, area: 66.599, yield: 220.00 },
      { year: 2020, area: 79.598, yield: 240.00 }
    ]
  },
  {
    id: "KAL01",
    name: "Őszi búza",
    type: "Kalászos",
    yearlyData: [
      { year: 2016, area: 34.36, yield: 206.04 },
      { year: 2017, area: 24.438, yield: 165.00 },
      { year: 2018, area: 4.70, yield: 36.00 },
      { year: 2019, area: 94.8556, yield: 650.00 },
      { year: 2020, area: 78.56, yield: 560.00 }
    ]
  },
  {
    id: "KAL04",
    name: "Őszi durumbúza",
    type: "Kalászos",
    yearlyData: [
      { year: 2016, area: 49.75, yield: 306.32 },
      { year: 2017, area: 101.978, yield: 615.00 },
      { year: 2018, area: 104.854, yield: 610.00 }
    ]
  },
  {
    id: "KAL17",
    name: "Őszi árpa",
    type: "Kalászos",
    yearlyData: [
      { year: 2016, area: 34.91, yield: 226.91 },
      { year: 2019, area: 23.79, yield: 180.00 },
      { year: 2020, area: 1.78, yield: 13.00 }
    ]
  },
  {
    id: "KAL18",
    name: "Tavaszi árpa",
    type: "Kalászos",
    yearlyData: [
      { year: 2020, area: 34.19, yield: 220.00 }
    ]
  },
  {
    id: "KAL19",
    name: "Tavaszi zab",
    type: "Kalászos",
    yearlyData: [
      { year: 2019, area: 4.24, yield: 8.00 }
    ]
  },
  {
    id: "KAL21",
    name: "Kukorica",
    type: "Kalászos",
    yearlyData: [
      { year: 2016, area: 67.73, yield: 818.85 },
      { year: 2017, area: 131.887, yield: 662.00 },
      { year: 2018, area: 110.702, yield: 1350.00 },
      { year: 2019, area: 87.908, yield: 720.00 },
      { year: 2020, area: 107.288, yield: 900.00 }
    ]
  },
  {
    id: "KAL32",
    name: "Szemescirok",
    type: "Kalászos",
    yearlyData: [
      { year: 2020, area: 13.85, yield: 70.00 }
    ]
  }
];

const DashboardHistorical = ({ farmData }: DashboardHistoricalProps) => {
  // In a real implementation, we would extract the historical data from the farmData
  // For now, we'll use the sample data based on the image
  
  // We could derive historicalData from farmData if it contains such information
  // const historicalData = farmData.historicalCrops || [];
  
  const historicalData = sampleHistoricalData;
  
  return (
    <div className="space-y-6">
      <HistoricalCrops 
        cropData={historicalData}
        title="Történeti növénytermesztési adatok"
        description={`${farmData.applicantName || "Gazdálkodó"} korábbi éveinek termésadatai a SAPS dokumentum alapján`}
      />
    </div>
  );
};

export default DashboardHistorical;
