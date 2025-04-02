
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, Coins, TrendingUp, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { LoanApplication } from "@/components/LoanApplication";

const Index = () => {
  return (
    <div className="container max-w-7xl mx-auto py-10">
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-4xl md:text-5xl font-bold">Agrár-hitelezés egyszerűen</h1>
        <p className="text-xl text-muted-foreground">
          Egyszerű és gyors mezőgazdasági hitelkérelem a SAPS adatok alapján
        </p>
      </div>

      <div className="mt-12">
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
  );
};

export default Index;
