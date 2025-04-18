
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Blocks, Euro, History, Map, Upload } from "lucide-react";
import { FarmData } from "@/types/farm";
import DashboardOverview from "./DashboardOverview";
import DashboardBlocks from "./DashboardBlocks";
import DashboardMap from "./DashboardMap";
import DashboardHistorical from "./DashboardHistorical";
import CurrentYearRevenue from "@/components/farm/CurrentYearRevenue";
import FileUpload from "@/components/FileUpload";
import { toast } from "sonner";
import { useAuth } from "@/App";
import { supabase } from "@/integrations/supabase/client";
import DeleteFarmData from "./DeleteFarmData";
import DashboardCrops from "./DashboardCrops";

interface DashboardContentProps {
  farmData: FarmData;
  onFarmDataUpdate?: (data: FarmData) => void;
}

const DashboardContent = ({ farmData, onFarmDataUpdate }: DashboardContentProps) => {
  const { user } = useAuth();
  const [farmId, setFarmId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchFarmId = async () => {
      if (!user) return;
      
      try {
        if (farmData.documentId) {
          const { data, error } = await supabase
            .from('farms')
            .select('id')
            .eq('document_id', farmData.documentId)
            .eq('user_id', user.id)
            .single();
            
          if (!error && data) {
            setFarmId(data.id);
            return;
          }
        }
        
        const { data, error } = await supabase
          .from('farms')
          .select('id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!error && data) {
          setFarmId(data.id);
        }
      } catch (error) {
        console.error("Hiba a farm azonosító lekérésekor:", error);
      }
    };
    
    fetchFarmId();
  }, [farmData, user]);

  const handleSapsUploadComplete = (data: FarmData) => {
    toast.success("SAPS dokumentum sikeresen feldolgozva");
    if (onFarmDataUpdate) {
      onFarmDataUpdate(data);
    }
  };
  
  const handleFarmDeleted = () => {
    window.location.reload();
  };

  const preparedCultures = farmData.cultures?.map(culture => ({
    name: culture.name,
    hectares: culture.hectares,
    estimatedRevenue: culture.estimatedRevenue || 0
  })) || [];

  return (
    <div className="space-y-4">
      {user && farmId && (
        <div className="flex justify-end">
          <DeleteFarmData 
            farmId={farmId} 
            userId={user.id} 
            onDeleted={handleFarmDeleted} 
          />
        </div>
      )}
      
      <Tabs defaultValue="basicData">
        <TabsList className="mb-6">
          <TabsTrigger value="basicData">
            <Database className="h-4 w-4 mr-2" />
            Alapadatok
          </TabsTrigger>
          <TabsTrigger value="blocks">
            <Blocks className="h-4 w-4 mr-2" />
            Blokkazonosítók
          </TabsTrigger>
          <TabsTrigger value="cultures">
            <Euro className="h-4 w-4 mr-2" />
            Növénykultúrák
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
        
        <TabsContent value="basicData">
          <DashboardOverview farmData={farmData} />
        </TabsContent>
        
        <TabsContent value="blocks">
          <DashboardBlocks farmData={farmData} />
        </TabsContent>
        
        <TabsContent value="cultures">
          <DashboardCrops farmData={farmData} />
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
    </div>
  );
};

export default DashboardContent;
