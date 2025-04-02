
import { Link } from "react-router-dom";
import { useAuth } from "@/App";
import { Home, FileText, LayoutDashboard, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Footer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
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
  
  if (!user) return null;
  
  return (
    <div className="bg-white border-t shadow-sm py-2 sticky bottom-0">
      <div className="container max-w-6xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1 md:space-x-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="flex flex-col items-center md:flex-row">
                <Home className="h-4 w-4 md:mr-2" />
                <span className="text-xs md:text-sm">Főoldal</span>
              </Button>
            </Link>
            
            <Link to="/dashboard">
              <Button variant="ghost" size="sm" className="flex flex-col items-center md:flex-row">
                <LayoutDashboard className="h-4 w-4 md:mr-2" />
                <span className="text-xs md:text-sm">Irányítópult</span>
              </Button>
            </Link>
            
            <Button variant="ghost" size="sm" className="flex flex-col items-center md:flex-row">
              <FileText className="h-4 w-4 md:mr-2" />
              <span className="text-xs md:text-sm">Szerződések</span>
            </Button>
            
            <Button variant="ghost" size="sm" className="flex flex-col items-center md:flex-row">
              <Settings className="h-4 w-4 md:mr-2" />
              <span className="text-xs md:text-sm">Beállítások</span>
            </Button>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex flex-col items-center md:flex-row" 
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 md:mr-2" />
            <span className="text-xs md:text-sm">Kijelentkezés</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Footer;
