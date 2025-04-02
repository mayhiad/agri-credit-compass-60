
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/components/LoanApplication";
import { AlertCircle, LogOut } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/App";
import DashboardLoading from "@/components/dashboard/DashboardLoading";
import DashboardError from "@/components/dashboard/DashboardError";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { Button } from "@/components/ui/button";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // If not authenticated and not loading, redirect to auth page
        if (!authLoading && !user) {
          navigate("/auth");
          return;
        }
        
        // Only proceed if we have a valid user
        if (user) {
          console.log("Fetching data for user:", user.id);
          
          // In a real app, this would fetch from the database based on user ID
          // For now, we're using dynamic mock data based on user email
          const mockFarmData: FarmData = {
            hectares: 450,
            cultures: [
              { name: "Búza", hectares: 200, estimatedRevenue: 40000000 },
              { name: "Kukorica", hectares: 150, estimatedRevenue: 32000000 },
              { name: "Napraforgó", hectares: 100, estimatedRevenue: 28000000 }
            ],
            totalRevenue: 100000000, // 100 millió Ft
            region: "Dél-Alföld",
            documentId: `SAPS-2023-${user.id.substring(0, 6)}`, // Make unique per user
            applicantName: user.email?.split('@')[0] || "Ismeretlen felhasználó",
            blockIds: [`K-${user.id.substring(0, 4)}`, `L-${user.id.substring(4, 8)}`],
            marketPrices: [
              { culture: "Búza", averageYield: 5.8, price: 85000, trend: 2.5 },
              { culture: "Kukorica", averageYield: 7.2, price: 78000, trend: -1.3 },
              { culture: "Napraforgó", averageYield: 3.1, price: 210000, trend: 4.2 }
            ]
          };
          
          setFarmData(mockFarmData);
        }
      } catch (error) {
        console.error("Error checking auth:", error);
        setError("Nem sikerült betölteni az adatokat");
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate, user, authLoading]);
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sikeres kijelentkezés");
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Hiba történt a kijelentkezés során");
    }
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
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Kijelentkezés
          </Button>
        </div>
        
        {error ? (
          <DashboardError message={error} />
        ) : farmData ? (
          <DashboardContent farmData={farmData} />
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Nincs hozzáférhető gazdasági adat.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
