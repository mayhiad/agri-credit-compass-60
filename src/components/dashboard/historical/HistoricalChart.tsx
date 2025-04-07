
import React from "react";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface HistoricalFarmData {
  year: string;
  hectares: number;
  totalRevenue: number;
  totalRevenueEUR: number;
  crops?: Array<{
    name: string;
    hectares: number;
    yield?: number;
    revenue?: number;
  }>;
}

interface HistoricalChartProps {
  historicalData: HistoricalFarmData[];
  averageRevenue: number;
  averageRevenueEUR: number;
}

const HistoricalChart = ({ historicalData, averageRevenue, averageRevenueEUR }: HistoricalChartProps) => {
  // Sort data by year to ensure chronological order
  const sortedData = [...historicalData].sort((a, b) => 
    parseInt(a.year) - parseInt(b.year)
  );

  // Transform data for the chart
  const chartData = sortedData.map(item => ({
    year: item.year,
    "Bevétel (ezer Ft)": Math.round(item.totalRevenue / 1000),
    "Bevétel (EUR)": Math.round(item.totalRevenueEUR),
    "Hektár": item.hectares,
  }));

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bevétel és területméret alakulása</CardTitle>
          <CardDescription>
            Az elmúlt évek árbevételének és területének változása
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis yAxisId="left" orientation="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => {
                  if (name === "Bevétel (ezer Ft)") {
                    return [`${value.toLocaleString()} ezer Ft`, "Bevétel (HUF)"];
                  } else if (name === "Bevétel (EUR)") {
                    return [`${value.toLocaleString()} EUR`, "Bevétel (EUR)"];
                  } else {
                    return [`${value.toLocaleString()} ha`, name];
                  }
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="Bevétel (ezer Ft)" fill="#8884d8" />
                <Line yAxisId="right" type="monotone" dataKey="Hektár" stroke="#82ca9d" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-blue-800">Átlagos éves bevétel (HUF)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700">
              {formatCurrency(averageRevenue)}
            </div>
            <p className="text-sm text-blue-600 mt-1">
              Az elmúlt {historicalData.length} év átlagában
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-green-800">Átlagos éves bevétel (EUR)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-700">
              {Math.round(averageRevenueEUR).toLocaleString()} EUR
            </div>
            <p className="text-sm text-green-600 mt-1">
              Az elmúlt {historicalData.length} év átlagában
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default HistoricalChart;
