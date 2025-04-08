
import { Link } from "react-router-dom";
import { useAuth } from "@/App";
import { FileText, LayoutDashboard, Settings, LogOut, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Header = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sikeres kijelentkezés");
      // Ensure we navigate to the home page with the proper branding
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Hiba történt a kijelentkezés során");
    }
  };
  
  return (
    <div className="bg-white border-b shadow-sm py-2 sticky top-0 z-10 w-full">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 md:space-x-4 overflow-x-auto pb-1">
            <Link to="/" className="mr-6 shrink-0">
              <span className="font-bold text-xl">
                <span className="text-primary">agri</span>
                <span className="text-black">FIx</span>
              </span>
            </Link>
            
            {user && (
              <>
                <Link to="/dashboard" className="shrink-0">
                  <Button variant="ghost" size="sm" className="flex flex-col items-center md:flex-row">
                    <LayoutDashboard className="h-4 w-4 md:mr-2" />
                    <span className="text-xs md:text-sm">Irányítópult</span>
                  </Button>
                </Link>
                
                <Button variant="ghost" size="sm" className="flex flex-col items-center md:flex-row shrink-0">
                  <FileText className="h-4 w-4 md:mr-2" />
                  <span className="text-xs md:text-sm">Szerződések</span>
                </Button>
                
                <Button variant="ghost" size="sm" className="flex flex-col items-center md:flex-row shrink-0">
                  <Settings className="h-4 w-4 md:mr-2" />
                  <span className="text-xs md:text-sm">Beállítások</span>
                </Button>
              </>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {user ? (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex flex-col items-center md:flex-row shrink-0" 
                onClick={handleSignOut}
              >
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="text-xs md:text-sm">Kijelentkezés</span>
              </Button>
            ) : (
              <Link to="/auth">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex flex-col items-center md:flex-row shrink-0"
                >
                  <LogIn className="h-4 w-4 md:mr-2" />
                  <span className="text-xs md:text-sm">Bejelentkezés</span>
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
