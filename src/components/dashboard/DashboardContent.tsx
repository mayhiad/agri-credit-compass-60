
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Map, Tractor } from "lucide-react";
import { FarmData } from "@/components/LoanApplication";
import DashboardOverview from "./DashboardOverview";
import DashboardCrops from "./DashboardCrops";
import DashboardMap from "./DashboardMap";

interface DashboardContentProps {
  farmData: FarmData;
}

const DashboardContent = ({ farmData }: DashboardContentProps) => {
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
        <TabsTrigger value="map">
          <Map className="h-4 w-4 mr-2" />
          Földterületek
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="overview">
        <DashboardOverview farmData={farmData} />
      </TabsContent>
      
      <TabsContent value="crops">
        <DashboardCrops farmData={farmData} />
      </TabsContent>
      
      <TabsContent value="map">
        <DashboardMap />
      </TabsContent>
    </Tabs>
  );
};

export default DashboardContent;
