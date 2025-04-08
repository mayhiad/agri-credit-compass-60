import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/App";
import { Button } from "@/components/ui/button";
import { ChevronRight, LogIn } from "lucide-react";
import { motion } from "framer-motion";
import Steps from "@/components/Steps";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const loanProcessSteps = [
    "Regisztráció", 
    "Gazdaság adatai", 
    "Hitelajánlat", 
    "Személyazonosítás", 
    "Feltételek", 
    "Szerződéskötés", 
    "Folyósítás"
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full py-4 px-6 flex justify-end">
        <Link to="/auth">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <LogIn className="h-4 w-4" />
            Regisztráció / Bejelentkezés
          </Button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <motion.div 
          className="text-center mb-16 max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-6xl font-bold mb-6 text-primary">
            agrFIx
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Nyújtsd be a hitelkérelmet mindössze 10 perc alatt, mi pedig 24 órán belül folyósítjuk a kért összeget!
          </p>
        </motion.div>

        <motion.div 
          className="w-full max-w-5xl mb-16 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h2 className="text-2xl font-semibold text-center mb-10">A hitelkérelem folyamata</h2>
          <Steps steps={loanProcessSteps} currentStep={0} />
        </motion.div>

        <motion.div 
          className="text-center max-w-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <Link to="/auth">
            <Button size="lg" className="px-8 py-6 text-lg">
              Regisztráció megkezdése
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          
          <p className="mt-6 text-gray-600 text-sm max-w-xl mx-auto">
            Készítsd elő a legfrisebb területalapú támogatási dokumentumodat, amelyről a szükséges naturália adatokat beolvassuk a hitelajánlat elkészítéséhez!
          </p>
        </motion.div>
      </main>
    </div>
  );
};

export default Index;
