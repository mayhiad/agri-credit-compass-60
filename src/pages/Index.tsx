import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Coins, TrendingUp, LogIn } from "lucide-react";
import { Link } from "react-router-dom";
import { LoanApplication } from "@/components/LoanApplication";
import { useAuth } from "@/App";
import Header from "@/components/Header";

const Index = () => {
  const { user, loading } = useAuth();
  
  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
      {/* Show header when user is logged in */}
      {user && !loading && <Header />}
      
      {/* Login button in top right corner for non-logged in users */}
      {!user && !loading && (
        <div className="container mx-auto px-4 py-4 flex flex-col items-end">
          <p className="text-sm text-muted-foreground mb-2">
            Már van fiókja? Jelentkezzen be a folytatáshoz.
          </p>
          <Link to="/auth">
            <Button className="gap-2">
              <LogIn className="h-4 w-4" />
              Bejelentkezés
            </Button>
          </Link>
        </div>
      )}
      
      <div className="container mx-auto px-4 py-10 flex-grow">
        <div className="text-center mb-10 space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold">AGRIFIX</h1>
          <p className="text-xl text-muted-foreground">
            Agrárhitel kihelyezés egy nap alatt, valós termelési adatok alapján!
          </p>
          {user && !loading ? (
            <div className="mt-4">
              <p className="text-primary font-medium">
                Üdvözöljük újra! Folytathatja a hiteligénylési folyamatot.
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-12 max-w-full">
          <LoanApplication />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-600" />
                Egyszerű folyamat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Csak töltse fel a SAPS dokumentumait, és mi automatikusan kiszámítjuk az elérhető hitelkeretet és feltételeket.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-600" />
                Versenyképes feltételek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                Kedvező kamatok és visszafizetési opciók, kifejezetten az agrárgazdálkodók igényeire szabva.
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                Gyors jóváhagyás
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>
                A hitelkeret gyors jóváhagyása és folyósítása, hogy biztosítsa a szezonális mezőgazdasági igényeket.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
