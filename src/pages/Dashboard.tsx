
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
        // Ha nem vagyunk hitelesítve és nem folyik a betöltés, irányítsuk át a bejelentkezési oldalra
        if (!authLoading && !user) {
          navigate("/auth");
          return;
        }
        
        // Csak akkor folytassuk, ha érvényes felhasználónk van
        if (user) {
          console.log("Adatok lekérése a felhasználó részére:", user.id);
          
          // Lekérjük a felhasználó specifikus farm adatait a Supabase-ből
          const { data: farms, error: farmError } = await supabase
            .from('farms')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (farmError) {
            console.error("Hiba a farm adatok lekérésekor:", farmError);
            setError("Nem sikerült betölteni a gazdaság adatait");
            return;
          }

          // Ha nincs farm adat, térjünk vissza
          if (!farms) {
            setFarmData(null);
            return;
          }

          // Részletes piaci árak lekérése
          const { data: marketPrices, error: marketPricesError } = await supabase
            .from('farm_details')
            .select('market_prices')
            .eq('farm_id', farms.id)
            .single();

          if (marketPricesError) {
            console.error("Hiba a piaci árak lekérésekor:", marketPricesError);
          }

          // Kultúrák lekérése
          const { data: cultures, error: culturesError } = await supabase
            .from('cultures')
            .select('*')
            .eq('farm_id', farms.id);

          if (culturesError) {
            console.error("Hiba a kultúrák lekérésekor:", culturesError);
          }

          // Farm adatok összeállítása
          const farmData: FarmData = {
            hectares: farms.hectares,
            cultures: cultures?.map(culture => ({
              name: culture.name,
              hectares: culture.hectares,
              estimatedRevenue: culture.estimated_revenue
            })) || [],
            totalRevenue: farms.total_revenue,
            region: farms.region || "Ismeretlen régió",
            documentId: farms.document_id || `SAPS-2023-${user.id.substring(0, 6)}`,
            applicantName: user.email?.split('@')[0] || "Ismeretlen felhasználó",
            blockIds: [`K-${user.id.substring(0, 4)}`, `L-${user.id.substring(4, 8)}`],
            marketPrices: (marketPrices?.market_prices || []).map(price => ({
              culture: price.culture,
              averageYield: price.averageYield,
              price: price.price,
              trend: price.trend,
              lastUpdated: new Date(price.lastUpdated)
            }))
          };
          
          setFarmData(farmData);
        }
      } catch (error) {
        console.error("Hiba az adatok betöltése során:", error);
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
      console.error("Kijelentkezési hiba:", error);
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
            <AlertDescription>Nincs hozzáférhető gazdasági adat. Kérjük, töltse fel SAPS dokumentumát.</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
