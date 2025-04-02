
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/App";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  customer_id: string | null;
  tax_id: string | null;
  phone: string | null;
  address: string | null;
  bank_account: string | null;
  created_at: string;
}

interface Farm {
  id: string;
  hectares: number;
  total_revenue: number;
  region: string | null;
  document_id: string | null;
}

interface Loan {
  id: string;
  contract_number: string | null;
  amount: number;
  interest_rate: number;
  payment_frequency: string;
  term_months: number;
  status: string;
  created_at: string;
}

const AdminCustomerDetail = () => {
  const { customerId } = useParams<{ customerId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkPermissionAndFetchData = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Check if user has admin or finance officer role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('*')
          .or('role.eq.admin,role.eq.finance_officer')
          .eq('user_id', user.id);
        
        if (roleError) throw roleError;
        
        if (!roleData || roleData.length === 0) {
          // User doesn't have permission
          navigate('/');
          return;
        }
        
        // Fetch customer profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (profileError) throw profileError;
        setProfile(profileData);
        
        // Fetch customer farms
        const { data: farmData, error: farmError } = await supabase
          .from('farms')
          .select('*')
          .eq('user_id', customerId);
        
        if (farmError) throw farmError;
        setFarms(farmData || []);
        
        // Fetch customer loans
        const { data: loanData, error: loanError } = await supabase
          .from('loans')
          .select('*')
          .eq('user_id', customerId);
        
        if (loanError) throw loanError;
        setLoans(loanData || []);
      } catch (error) {
        console.error('Error fetching customer data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkPermissionAndFetchData();
    }
  }, [customerId, user, authLoading, navigate]);
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800 text-xs">Jóváhagyásra vár</span>;
      case 'kiutalásra vár':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">Kiutalásra vár</span>;
      case 'kihelyezett hitelösszeg':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs">Kihelyezett hitelösszeg</span>;
      case 'closed':
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs">Lezárt</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-xs">{status}</span>;
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Ügyfél nem található</h1>
        <Button onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az admin felületre
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center mb-6 gap-4">
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az admin felületre
        </Button>
        <h1 className="text-3xl font-bold">
          Ügyfél részletes adatok
        </h1>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ügyfél alapadatok</CardTitle>
          <CardDescription>
            Ügyfélszám: {profile.customer_id || 'Nincs megadva'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Név</h3>
              <p>{profile.last_name || ''} {profile.first_name || ''}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Adószám</h3>
              <p>{profile.tax_id || 'Nincs megadva'}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Telefonszám</h3>
              <p>{profile.phone || 'Nincs megadva'}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Cím</h3>
              <p>{profile.address || 'Nincs megadva'}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Bankszámlaszám</h3>
              <p>{profile.bank_account || 'Nincs megadva'}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-sm text-muted-foreground mb-1">Regisztráció dátuma</h3>
              <p>{new Date(profile.created_at).toLocaleDateString('hu-HU')}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Tabs defaultValue="farms" className="mt-6">
        <TabsList>
          <TabsTrigger value="farms">Gazdasági adatok</TabsTrigger>
          <TabsTrigger value="loans">Szerződések</TabsTrigger>
        </TabsList>
        
        <TabsContent value="farms" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Gazdaságok</CardTitle>
            </CardHeader>
            <CardContent>
              {farms.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Régió</TableHead>
                      <TableHead>Méret (hektár)</TableHead>
                      <TableHead>Bevétel (Ft)</TableHead>
                      <TableHead>Dokumentum azonosító</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {farms.map(farm => (
                      <TableRow key={farm.id}>
                        <TableCell>{farm.region || '-'}</TableCell>
                        <TableCell>{farm.hectares}</TableCell>
                        <TableCell>{formatCurrency(farm.total_revenue)}</TableCell>
                        <TableCell>{farm.document_id || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>Nincsenek gazdasági adatok rögzítve.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="loans" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hitelszerződések</CardTitle>
            </CardHeader>
            <CardContent>
              {loans.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Szerződésszám</TableHead>
                      <TableHead>Összeg</TableHead>
                      <TableHead>Kamat</TableHead>
                      <TableHead>Futamidő</TableHead>
                      <TableHead>Státusz</TableHead>
                      <TableHead>Létrehozva</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loans.map(loan => (
                      <TableRow key={loan.id}>
                        <TableCell>{loan.contract_number || '-'}</TableCell>
                        <TableCell>{formatCurrency(loan.amount)}</TableCell>
                        <TableCell>{loan.interest_rate}%</TableCell>
                        <TableCell>{loan.term_months} hónap</TableCell>
                        <TableCell>{getStatusBadge(loan.status)}</TableCell>
                        <TableCell>
                          {new Date(loan.created_at).toLocaleDateString('hu-HU')}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm"
                            onClick={() => navigate(`/admin/loan/${loan.id}`)}
                          >
                            Részletek
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>Nincsenek hitelszerződések rögzítve.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCustomerDetail;
