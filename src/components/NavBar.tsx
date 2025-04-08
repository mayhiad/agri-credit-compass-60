
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/App";
import { toast } from "sonner";

interface NavBarProps {
  onSignOut?: () => void;
}

const NavBar = ({ onSignOut }: NavBarProps) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();
  
  const handleSignOut = async () => {
    try {
      if (onSignOut) {
        onSignOut();
      } else {
        await signOut();
        toast.success("Sikeres kijelentkezés");
      }
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Hiba történt a kijelentkezés során");
    }
  };
  
  return (
    <nav className="bg-white border-b shadow-sm">
      <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-primary">Agrár-Hitel</h1>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/dashboard"
                  className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  Irányítópult
                </Link>
                <Link
                  to="/"
                  className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  Hiteligénylés
                </Link>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Kijelentkezés
              </Button>
            </div>
          </div>
          
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-primary focus:outline-none"
            >
              <span className="sr-only">Menü megnyitása</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/dashboard"
              className="text-gray-700 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Irányítópult
            </Link>
            <Link
              to="/"
              className="text-gray-700 hover:text-primary block px-3 py-2 rounded-md text-base font-medium"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Hiteligénylés
            </Link>
          </div>
          <div className="pt-4 pb-3 border-t border-gray-200">
            <div className="px-2">
              <Button 
                variant="ghost" 
                className="w-full flex justify-start" 
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleSignOut();
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Kijelentkezés
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
