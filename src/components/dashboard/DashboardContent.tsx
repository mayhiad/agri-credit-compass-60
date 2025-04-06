
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Map, Tractor, Upload, History, Euro, FileText, Database } from "lucide-react";
import { FarmData } from "@/components/LoanApplication";
import DashboardOverview from "./DashboardOverview";
import DashboardCrops from "./DashboardCrops";
import DashboardMap from "./DashboardMap";
import DashboardHistorical from "./DashboardHistorical";
import CurrentYearRevenue from "@/components/farm/CurrentYearRevenue";
import FileUpload from "@/components/FileUpload";
import OcrLogViewer from "./OcrLogViewer";
import { toast } from "sonner";
import { useAuth } from "@/App";
import { supabase } from "@/integrations/supabase/client";
import DeleteFarmData from "./DeleteFarmData";

interface DashboardContentProps {
  farmData: FarmData;
  onFarmDataUpdate?: (data: FarmData) => void;
}

const DashboardContent = ({ farmData, onFarmDataUpdate }: DashboardContentProps) => {
  const { user } = useAuth();
  const [farmId, setFarmId] = useState<string | null>(null);
  
  useEffect(() => {
    // Ha van farmData, akkor próbáljuk meg lekérni a farm azonosítóját
    const fetchFarmId = async () => {
      if (!user) return;
      
      try {
        // Megnézzük, hogy van-e már a farmnak rekordja az adatbázisban a dokumentum azonosító alapján
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
        
        // Ha nincs, akkor a legutolsó farmot vesszük alapul
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
    // Frissítsük az oldalt, hogy a felhasználó lássa a változást
    window.location.reload();
  };

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
          <TabsTrigger value="ocrlogs">
            <FileText className="h-4 w-4 mr-2" />
            OCR Naplók
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
        
        <TabsContent value="ocrlogs">
          <OcrLogViewer />
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
