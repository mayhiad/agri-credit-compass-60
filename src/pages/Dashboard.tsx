
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FarmData } from "@/components/LoanApplication";
import { formatCurrency } from "@/lib/utils";
import { FarmInfoDisplay } from "@/components/FarmInfo";
import { AlertCircle, LayoutDashboard, Loader2, LogOut, Map, Tractor } from "lucide-react";
import { toast } from "sonner";
import NavBar from "@/components/NavBar";
import FarmLocation from "@/components/FarmLocation";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        
        if (!data.session) {
          navigate("/auth");
          return;
        }
        
        // Fetch user's farm data
        // In a real app, this would fetch from the database
        // For now, we're using mock data
        setFarmData({
          hectares: 450,
          cultures: [
            { name: "Búza", hectares: 200, estimatedRevenue: 40000000 },
            { name: "Kukorica", hectares: 150, estimatedRevenue: 32000000 },
            { name: "Napraforgó", hectares: 100, estimatedRevenue: 28000000 }
          ],
          totalRevenue: 100000000, // 100 millió Ft
          region: "Dél-Alföld",
          documentId: "SAPS-2023-568742",
          applicantName: "Kovács János"
        });
      } catch (error) {
        console.error("Error checking auth:", error);
        setError("Nem sikerült betölteni az adatokat");
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);
  
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
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <>
      <NavBar onSignOut={handleSignOut} />
      
      <div className="container max-w-6xl mx-auto py-10">
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
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : farmData ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Gazdaságom adatai</CardTitle>
                    <CardDescription>
                      SAPS dokumentum alapján
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Dokumentum azonosító</TableCell>
                          <TableCell>{farmData.documentId}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Régió</TableCell>
                          <TableCell>{farmData.region}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Gazdálkodó</TableCell>
                          <TableCell>{farmData.applicantName}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Összes terület</TableCell>
                          <TableCell>{farmData.hectares} ha</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Éves árbevétel</TableCell>
                          <TableCell>{formatCurrency(farmData.totalRevenue)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Hitelkeret információ</CardTitle>
                    <CardDescription>
                      A SAPS adatok alapján kalkulált hitelkeret
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                      <div className="font-semibold text-lg mb-1">Elérhető hitelkeret:</div>
                      <div className="text-3xl font-bold text-green-700 mb-2">
                        {formatCurrency(Math.round(farmData.totalRevenue * 0.4))}
                      </div>
                      <div className="text-sm text-green-600">
                        A szerződéskötéstől számított 48 órán belül folyósítunk.
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <Button className="w-full" onClick={() => navigate("/")}>
                        Hiteligénylés indítása
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="crops">
              <Card>
                <CardHeader>
                  <CardTitle>Növénykultúrák</CardTitle>
                  <CardDescription>
                    A SAPS dokumentum alapján rögzített növénykultúrák
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kultúra</TableHead>
                        <TableHead className="text-right">Terület (ha)</TableHead>
                        <TableHead className="text-right">Becsült bevétel</TableHead>
                        <TableHead className="text-right">Piaci ár (Ft/tonna)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {farmData.cultures.map((culture, idx) => {
                        // Mock piaci árak
                        const marketPrices = {
                          "Búza": 85000,
                          "Kukorica": 75000,
                          "Napraforgó": 180000
                        };
                        
                        const price = (marketPrices as any)[culture.name] || 100000;
                        
                        return (
                          <TableRow key={idx}>
                            <TableCell>{culture.name}</TableCell>
                            <TableCell className="text-right">{culture.hectares}</TableCell>
                            <TableCell className="text-right">{formatCurrency(culture.estimatedRevenue)}</TableCell>
                            <TableCell className="text-right">{formatCurrency(price)}</TableCell>
                          </TableRow>
                        );
                      })}
                      <TableRow>
                        <TableCell className="font-medium">Összesen</TableCell>
                        <TableCell className="text-right font-medium">{farmData.hectares} ha</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(farmData.totalRevenue)}</TableCell>
                        <TableCell className="text-right"></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="map">
              <Card>
                <CardHeader>
                  <CardTitle>Földterületek</CardTitle>
                  <CardDescription>
                    A SAPS dokumentum alapján azonosított földterületek térképe
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-md overflow-hidden border">
                    <FarmLocation />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Nincs hozzáférhető gazdasági adat.</AlertDescription>
          </Alert>
        )}
      </div>
    </>
  );
};

export default Dashboard;
