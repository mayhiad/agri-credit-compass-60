import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/App";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogOut } from "lucide-react";
import AdminLoanList from "@/components/admin/AdminLoanList";
import AdminCustomerList from "@/components/admin/AdminCustomerList";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isFinanceOfficer, setIsFinanceOfficer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate('/auth');
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
      navigate("/");
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
    <div className="container mx-auto py-8 relative">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin felület</h1>
        <Button 
          variant="destructive" 
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Kijelentkezés
        </Button>
      </div>
      
      <Tabs defaultValue="dashboard">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Áttekintés</TabsTrigger>
          <TabsTrigger value="customers">Ügyfelek</TabsTrigger>
          <TabsTrigger value="loans">Hitelszerződések</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboard" className="mt-6">
          <AdminDashboard isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
        </TabsContent>
        
        <TabsContent value="customers" className="mt-6">
          <AdminCustomerList isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
        </TabsContent>
        
        <TabsContent value="loans" className="mt-6">
          <AdminLoanList isAdmin={isAdmin} isFinanceOfficer={isFinanceOfficer} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
