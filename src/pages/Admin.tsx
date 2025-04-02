
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/App";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import AdminLoanList from "@/components/admin/AdminLoanList";
import AdminCustomerList from "@/components/admin/AdminCustomerList";
import AdminDashboard from "@/components/admin/AdminDashboard";

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
        // Check if user has admin role
        const { data: adminData, error: adminError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'admin');
        
        if (adminError) throw adminError;
        setIsAdmin(adminData && adminData.length > 0);

        // Check if user has finance officer role
        const { data: financeData, error: financeError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('user_id', user.id)
          .eq('role', 'finance_officer');
        
        if (financeError) throw financeError;
        setIsFinanceOfficer(financeData && financeData.length > 0);

        // If not admin or finance officer, redirect to home
        if (!adminData?.length && !financeData?.length) {
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

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Admin felület</h1>
      
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
