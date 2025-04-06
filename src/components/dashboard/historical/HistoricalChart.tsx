
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { HistoricalFarmData } from "./types";

interface HistoricalChartProps {
  historicalData: HistoricalFarmData[];
  averageRevenue: number;
  averageRevenueEUR: number;
}

const HistoricalChart = ({ historicalData, averageRevenue, averageRevenueEUR }: HistoricalChartProps) => {
  const chartData = historicalData.map(data => ({
    name: data.year,
    'Bevétel (HUF)': data.totalRevenue / 1000000, // millió forintban
    'Bevétel (EUR)': data.totalRevenueEUR / 1000, // ezer euróban
    hectares: data.totalHectares
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Bevétel trend az elmúlt 5 évben</h3>
        <p className="text-sm text-muted-foreground">
          Az elmúlt {historicalData.length} év átlagos bevétele: 
          <span className="font-bold ml-1">{formatCurrency(averageRevenue)}</span> 
          <span className="text-xs ml-1">({formatCurrency(averageRevenueEUR, "EUR")})</span>
        </p>
        
        <div className="h-[350px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#82ca9d" />
              <YAxis yAxisId="right" orientation="right" stroke="#8884d8" />
              <Tooltip formatter={(value, name) => {
                if (name === 'Bevétel (HUF)') return [`${value} millió Ft`, 'Bevétel (HUF)'];
                if (name === 'Bevétel (EUR)') return [`${value} ezer EUR`, 'Bevétel (EUR)'];
                return [value, name];
              }} />
              <Legend />
              <Bar yAxisId="left" dataKey="Bevétel (HUF)" fill="#8884d8" name="Bevétel (millió Ft)" />
              <Bar yAxisId="right" dataKey="Bevétel (EUR)" fill="#82ca9d" name="Bevétel (ezer EUR)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      <div className="space-y-2">
        <h3 className="text-lg font-medium">Összterület trend</h3>
        <div className="h-[250px] mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="hectares" fill="#ffc658" name="Hektár" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default HistoricalChart;
