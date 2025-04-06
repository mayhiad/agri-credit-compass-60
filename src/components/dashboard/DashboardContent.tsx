
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Map, Tractor, Upload, History, Euro, CreditCard } from "lucide-react";
import { FarmData } from "@/components/LoanApplication";
import DashboardOverview from "./DashboardOverview";
import DashboardCrops from "./DashboardCrops";
import DashboardMap from "./DashboardMap";
import DashboardHistorical from "./DashboardHistorical";
import CurrentYearRevenue from "@/components/farm/CurrentYearRevenue";
import FileUpload from "@/components/FileUpload";
import { toast } from "sonner";

interface DashboardContentProps {
  farmData: FarmData;
  onFarmDataUpdate?: (data: FarmData) => void;
}

const DashboardContent = ({ farmData, onFarmDataUpdate }: DashboardContentProps) => {
  const handleSapsUploadComplete = (data: FarmData) => {
    toast.success("SAPS dokumentum sikeresen feldolgozva");
    if (onFarmDataUpdate) {
      onFarmDataUpdate(data);
    }
  };

  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-6">
        <TabsTrigger value="overview">
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Áttekintés
        </TabsTrigger>
        <TabsTrigger value="crops">
          <Tractor className="h-4 w-4 mr-2" />
          Növénykultúrák
        </TabsTrigger>
        <TabsTrigger value="currentYear">
          <Euro className="h-4 w-4 mr-2" />
          Aktuális bevétel
        </TabsTrigger>
        <TabsTrigger value="historical">
          <History className="h-4 w-4 mr-2" />
          Történeti adatok
        </TabsTrigger>
        <TabsTrigger value="map">
          <Map className="h-4 w-4 mr-2" />
          Földterületek
        </TabsTrigger>
        <TabsTrigger value="upload">
          <Upload className="h-4 w-4 mr-2" />
          SAPS dokumentum feltöltése
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview">
        <DashboardOverview farmData={farmData} />
      </TabsContent>
      
      <TabsContent value="crops">
        <DashboardCrops farmData={farmData} />
      </TabsContent>
      
      <TabsContent value="currentYear">
        <CurrentYearRevenue
          cultures={farmData.cultures || []}
          totalRevenue={farmData.totalRevenue || 0}
        />
      </TabsContent>
      
      <TabsContent value="historical">
        <DashboardHistorical />
      </TabsContent>
      
      <TabsContent value="map">
        <DashboardMap />
      </TabsContent>

      <TabsContent value="upload">
        <div className="max-w-3xl mx-auto">
          <FileUpload onComplete={handleSapsUploadComplete} />
        </div>
      </TabsContent>
    </Tabs>
  );
};

export default DashboardContent;
