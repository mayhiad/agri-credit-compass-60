
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { ChevronRight, LogIn, FileText, Upload, Search, FileCheck, FileSignature, PiggyBank } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const processSteps = [
    { 
      id: 1, 
      title: "Regisztráció", 
      icon: <LogIn className="h-8 w-8 text-primary" />
    },
    { 
      id: 2, 
      title: "Gazdaság adatainak feltöltése", 
      icon: <Upload className="h-8 w-8 text-primary" /> 
    },
    { 
      id: 3, 
      title: "Hitelajánlat", 
      icon: <Search className="h-8 w-8 text-primary" /> 
    },
    { 
      id: 4, 
      title: "Személyazonosítás", 
      icon: <FileText className="h-8 w-8 text-primary" /> 
    },
    { 
      id: 5, 
      title: "Feltételek áttekintése", 
      icon: <FileCheck className="h-8 w-8 text-primary" /> 
    },
    { 
      id: 6, 
      title: "Szerződéskötés", 
      icon: <FileSignature className="h-8 w-8 text-primary" /> 
    },
    { 
      id: 7, 
      title: "Folyósítás", 
      icon: <PiggyBank className="h-8 w-8 text-primary" /> 
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header with login button */}
      <header className="w-full py-4 px-6 flex justify-end">
        <Link to="/auth">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Regisztráció / Bejelentkezés
          </Button>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        {/* Logo and tagline */}
        <div className="text-center mb-16 max-w-3xl">
          <img 
            src="/lovable-uploads/48c8da26-9c78-4840-b766-0dae2b64a5d4.png" 
            alt="AgriFIX Logo" 
            className="h-16 mx-auto mb-6"
          />
          <h1 className="text-3xl font-bold mb-4">Mezőgazdasági szabadfelhasználású gyorshitel</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Nyújtsd be a hitelkérelmet mindössze 10 perc alatt, mi pedig 24 órán belül folyósítjuk a kért összeget!
          </p>
        </div>

        {/* Process flow */}
        <div className="w-full max-w-6xl mb-16">
          <h2 className="text-2xl font-semibold text-center mb-10">A hitelkérelem folyamata</h2>
          
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
            
            {/* Process steps */}
            <div className="flex justify-between relative z-10">
              {processSteps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div className="bg-white rounded-full p-4 border-2 border-primary mb-3">
                    {step.icon}
                  </div>
                  <span className="text-sm font-medium text-center max-w-[120px]">{step.title}</span>
                  
                  {/* Arrow between steps (except after the last step) */}
                  {index < processSteps.length - 1 && (
                    <div className="absolute top-1/2 left-[calc((100%/7)*{index}+50px)] -translate-y-1/2 text-gray-400">
                      <ChevronRight className="h-6 w-6" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center max-w-2xl">
          <Link to="/auth">
            <Button size="lg" className="px-8 py-6 text-lg">
              Regisztráció megkezdése
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          
          <p className="mt-6 text-gray-600 text-sm max-w-xl mx-auto">
            Készítsd elő a legfrisebb területalapú támogatási dokumentumodat, amelyről a szükséges naturália adatokat beolvassuk a hitelajánlat elkészítéséhez!
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
