
import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import AdminDashboard from "@/components/admin/AdminDashboard";

const Admin = () => {
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

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container max-w-7xl mx-auto py-6 flex justify-end">
        <Button 
          variant="destructive" 
          size="sm" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Kijelentkezés
        </Button>
      </div>
      <div className="flex-grow">
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
