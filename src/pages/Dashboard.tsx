
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/components/LoanApplication";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import { useAuth } from "@/App";
import DashboardLoading from "@/components/dashboard/DashboardLoading";
import DashboardError from "@/components/dashboard/DashboardError";
import DashboardContent from "@/components/dashboard/DashboardContent";
import DebuggingInfo from "@/components/dashboard/DebuggingInfo";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
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
            setLoading(false);
            return;
          }

          // Ha nincs farm adat, térjünk vissza
          if (!farms) {
            setFarmData(null);
            setLoading(false);
            return;
          }

          // Részletes piaci árak lekérése
          const { data: farmDetails, error: marketPricesError } = await supabase
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
          const marketPriceData = farmDetails?.market_prices && 
            Array.isArray(farmDetails.market_prices) ? 
            farmDetails.market_prices.map((price: any) => ({
              culture: price.culture,
              averageYield: price.averageYield,
              price: price.price,
              trend: price.trend,
              lastUpdated: new Date(price.lastUpdated || new Date().toISOString())
            })) : [];
          
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
            marketPrices: marketPriceData
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
  
  const handleSapsUploadComplete = (data: FarmData) => {
    setFarmData(data);
    setShowUploadForm(false);
    toast.success("SAPS dokumentum sikeresen feldolgozva");
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
          <DashboardError message={error} />
        ) : farmData ? (
          <DashboardContent farmData={farmData} />
        ) : showUploadForm ? (
          <FileUpload onComplete={handleSapsUploadComplete} />
        ) : (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6 text-center">
            <div className="mb-6">
              <img 
                src="/placeholder.svg" 
                alt="SAPS dokumentum" 
                className="mx-auto w-32 h-32 opacity-70"
              />
            </div>
            
            <h2 className="text-2xl font-semibold mb-2">Nincsenek még gazdasági adatok</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Adja hozzá gazdaságának adatait egyszerűen, töltse fel SAPS dokumentumát a hiteligénylési folyamat megkezdéséhez.
            </p>
            
            <Button onClick={() => setShowUploadForm(true)} size="lg" className="mt-2">
              SAPS dokumentum feltöltése
            </Button>
          </div>
        )}
        
        {user && <DebuggingInfo userId={user.id} />}
      </div>
    </div>
  );
};

export default Dashboard;
