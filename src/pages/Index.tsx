
import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const processSteps = [
    { id: 1, title: "Regisztráció" },
    { id: 2, title: "Gazdaság adatainak feltöltése" },
    { id: 3, title: "Hitelajánlat" },
    { id: 4, title: "Személyazonosítás" },
    { id: 5, title: "Feltételek áttekintése" },
    { id: 6, title: "Szerződéskötés" },
    { id: 7, title: "Folyósítás" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-blue-50">
      {/* Header with login/register button */}
      <header className="w-full py-4 px-6 flex justify-end">
        <Link to="/auth">
          <Button variant="outline" className="font-medium">
            Regisztráció / Bejelentkezés
          </Button>
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center justify-center py-12">
        {/* Logo and tagline */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-primary">agri</span>
            <span className="text-blue-600">FIx</span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-700 mb-4">
            Mezőgazdasági szabadfelhasználású gyorshitel
          </p>
          <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto">
            Nyújtsd be a hitelkérelmet mindössze 10 perc alatt, mi pedig 24 órán belül folyósítjuk a kért összeget!
          </p>
        </div>

        {/* Process flow diagram */}
        <div className="w-full max-w-5xl mb-16">
          <h2 className="text-2xl font-semibold text-center mb-8">Hitelfolyamat lépései</h2>
          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-blue-200 -translate-y-1/2 z-0"></div>
            
            {/* Process steps */}
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
              {processSteps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center relative z-10">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center border-2 border-blue-500 shadow-md mb-3">
                    <span className="text-blue-600 font-bold text-lg">{step.id}</span>
                  </div>
                  <p className="text-center text-sm font-medium">{step.title}</p>
                  {index < processSteps.length - 1 && (
                    <div className="md:hidden flex justify-center w-full py-2">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA section */}
        <div className="text-center">
          <Link to="/auth">
            <Button size="lg" className="text-lg px-8 py-6 mb-6">
              Regisztráció megkezdése
            </Button>
          </Link>
          <div className="max-w-2xl mx-auto">
            <p className="text-gray-600 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <span>
                Készítsd elő a legfrisebb területalapú támogatási dokumentumodat, amelyről a szükséges naturália adatokat beolvassuk a hitelajánlat elkészítéséhez!
              </span>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
