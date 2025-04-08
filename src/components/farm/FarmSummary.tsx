
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tractor, Map, Euro, LayoutGrid } from "lucide-react";

export interface FarmSummaryProps {
  hectares: number;
  cultures: number;
  blocksCount: number;
  totalRevenue: number;
}

const FarmSummary: React.FC<FarmSummaryProps> = ({ 
  hectares, 
  cultures, 
  blocksCount, 
  totalRevenue 
}) => {
  // Format numbers with local separator
  const formatNumber = (num: number) => {
    return num.toLocaleString('hu-HU');
  };
  
  // Format currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('hu-HU', { 
      style: 'currency', 
      currency: 'HUF',
      maximumFractionDigits: 0
    }).format(value);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tractor className="h-5 w-5 text-primary" />
          Gazdaság összesítő
        </CardTitle>
        <CardDescription>
          A gazdaság főbb adatainak összesítése
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Map className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Összes terület</p>
              <p className="text-lg font-bold">{formatNumber(hectares)} ha</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Tractor className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Növénykultúrák</p>
              <p className="text-lg font-bold">{cultures} db</p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <LayoutGrid className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Blokkazonosítók</p>
              <p className="text-lg font-bold">{blocksCount} db</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Euro className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-muted-foreground">Várható bevétel</p>
              <p className="text-lg font-bold">{formatCurrency(totalRevenue)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FarmSummary;
