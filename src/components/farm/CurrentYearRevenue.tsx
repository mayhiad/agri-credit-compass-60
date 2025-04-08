
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Euro, TrendingUp, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Culture } from "@/types/farm";

export interface CurrentYearRevenueProps {
  totalRevenue: number;
  hectares: number;
  cultures?: Culture[];
}

const CurrentYearRevenue: React.FC<CurrentYearRevenueProps> = ({ 
  totalRevenue, 
  hectares,
  cultures = []
}) => {
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('hu-HU', { 
      style: 'currency', 
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  // Calculate revenue per hectare
  const revenuePerHectare = hectares > 0 ? totalRevenue / hectares : 0;
  
  // Get top 3 cultures by revenue
  const topCultures = [...cultures]
    .sort((a, b) => (b.estimatedRevenue || 0) - (a.estimatedRevenue || 0))
    .slice(0, 3);
  
  // Calculate the percentage of each culture's revenue to total revenue
  const totalEstimatedRevenue = totalRevenue || 
    cultures.reduce((sum, c) => sum + (c.estimatedRevenue || 0), 0);
  
  const getPercentage = (revenue: number) => {
    if (!totalEstimatedRevenue) return 0;
    return Math.round((revenue / totalEstimatedRevenue) * 100);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Euro className="h-5 w-5 text-primary" />
          Aktuális évi bevétel
        </CardTitle>
        <CardDescription>
          A gazdaság várható bevétele az aktuális évre
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Összes várható bevétel</p>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">+12%</span>
              </div>
            </div>
            <p className="text-3xl font-bold mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-2">Hektáronkénti bevétel</p>
            <div className="flex items-center justify-between">
              <p className="font-semibold">{formatCurrency(revenuePerHectare)}</p>
              <p className="text-sm text-muted-foreground">{hectares} hektárra</p>
            </div>
          </div>
          
          {topCultures.length > 0 && (
            <div>
              <div className="flex items-center gap-1 mb-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                <p className="text-sm font-medium text-muted-foreground">Bevételi megoszlás kultúránként</p>
              </div>
              
              <div className="space-y-3">
                {topCultures.map((culture, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium truncate max-w-[70%]">{culture.name}</p>
                      <p className="text-sm text-muted-foreground">{getPercentage(culture.estimatedRevenue || 0)}%</p>
                    </div>
                    <Progress value={getPercentage(culture.estimatedRevenue || 0)} className="h-2" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurrentYearRevenue;
