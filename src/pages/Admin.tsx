
import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogOut, Loader2 } from "lucide-react";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { useAuth } from "@/App";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isFinanceOfficer, setIsFinanceOfficer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate('/admin/auth');
        return;
      }

      try {
        const { data: adminRoleData, error: adminError } = await supabase.rpc('is_admin');
        
        if (adminError) throw adminError;
        setIsAdmin(!!adminRoleData);

        const { data: financeRoleData, error: financeError } = await supabase.rpc('is_finance_officer');
        
        if (financeError) throw financeError;
        setIsFinanceOfficer(!!financeRoleData);

        if (!adminRoleData && !financeRoleData) {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkAdminStatus();
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Sikeres kijelentkezés");
      navigate("/"); // Redirect to the landing page
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Hiba történt a kijelentkezés során");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <AdminDashboard isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
      </div>
    </div>
  );
};

export default Admin;
