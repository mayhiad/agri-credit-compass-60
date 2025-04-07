
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/App";
import DashboardLoading from "@/components/dashboard/DashboardLoading";
import DashboardError from "@/components/dashboard/DashboardError";
import DashboardContent from "@/components/dashboard/DashboardContent";
import DebuggingInfo from "@/components/dashboard/DebuggingInfo";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import { fetchFarmData } from "@/services/dashboardService";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // If not authenticated and not loading, redirect to login page
        if (!authLoading && !user) {
          navigate("/auth");
          return;
        }
        
        // Only continue if we have a valid user
        if (user) {
          console.log("Adatok lekérése a felhasználó részére:", user.id);
          
          const { data: farmData, error } = await fetchFarmData(user.id);
          
          if (error) {
            setError(error);
          } else {
            setFarmData(farmData);
          }
        }
      } catch (error) {
        console.error("Hiba az adatok betöltése során:", error);
        setError("Váratlan hiba történt az adatok betöltése során. Kérjük próbálja újra később.");
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [navigate, user, authLoading]);
  
  const handleSapsUploadComplete = (data: FarmData) => {
    setFarmData(data);
    setShowUploadForm(false);
    setError(null); // Hiba törlése sikeres feltöltés esetén
    toast.success("SAPS dokumentum sikeresen feldolgozva");
  };

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Újratöltjük az oldalt a friss adatokért
    window.location.reload();
  };

  const handleAddFarmData = () => {
    setShowUploadForm(true);
    setError(null);
  };
  
  if (loading || authLoading) {
    return <DashboardLoading />;
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <div className="container max-w-6xl mx-auto py-10 flex-grow">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Gazdaságom</h1>
            <p className="text-muted-foreground">Üdvözöljük a gazdasági irányítópultján</p>
          </div>
        </div>
        
        {error ? (
          <DashboardErrorView 
            error={error} 
            onRetry={handleRetry} 
            onAddFarmData={handleAddFarmData} 
          />
        ) : farmData ? (
          <DashboardContent farmData={farmData} onFarmDataUpdate={setFarmData} />
        ) : showUploadForm ? (
          <FileUpload onComplete={handleSapsUploadComplete} />
        ) : (
          <DashboardEmptyState onShowUploadForm={() => setShowUploadForm(true)} />
        )}
        
        {user && <DebuggingInfo userId={user.id} />}
      </div>
    </div>
  );
};

export default Dashboard;
