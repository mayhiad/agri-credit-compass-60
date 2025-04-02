
import { useState, useEffect } from "react";
import { 
  Table, TableHeader, TableRow, TableHead, 
  TableBody, TableCell 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileWithDetails {
  id: string;
  first_name: string | null;
  last_name: string | null;
  customer_id: string | null;
  tax_id: string | null;
  phone: string | null;
  bank_account: string | null;
  created_at: string;
  address?: string | null;
}

interface AdminCustomerListProps {
  isAdmin: boolean;
  isFinanceOfficer: boolean;
}

const AdminCustomerList = ({ isAdmin, isFinanceOfficer }: AdminCustomerListProps) => {
  const [customers, setCustomers] = useState<ProfileWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        setCustomers(data as ProfileWithDetails[] || []);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, []);

  const filteredCustomers = customers.filter(customer => {
    const searchLower = searchTerm.toLowerCase();
    return (
      (customer.first_name?.toLowerCase().includes(searchLower)) ||
      (customer.last_name?.toLowerCase().includes(searchLower)) ||
      (customer.customer_id?.toLowerCase().includes(searchLower)) ||
      (customer.tax_id?.toLowerCase().includes(searchLower))
    );
  });

  const viewCustomerDetails = (customerId: string) => {
    // Navigate to customer details page
    navigate(`/admin/customer/${customerId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ügyfelek listája</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés név, ügyfélszám vagy adószám alapján..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ügyfélszám</TableHead>
                <TableHead>Név</TableHead>
                <TableHead>Adószám</TableHead>
                <TableHead>Telefonszám</TableHead>
                <TableHead>Regisztráció dátuma</TableHead>
                <TableHead>Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell className="font-medium">{customer.customer_id || '-'}</TableCell>
                    <TableCell>{`${customer.last_name || ''} ${customer.first_name || ''}`}</TableCell>
                    <TableCell>{customer.tax_id || '-'}</TableCell>
                    <TableCell>{customer.phone || '-'}</TableCell>
                    <TableCell>
                      {new Date(customer.created_at).toLocaleDateString('hu-HU')}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => viewCustomerDetails(customer.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Részletek
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {searchTerm ? 'Nincs találat a keresési feltételekre.' : 'Nincsenek ügyfelek.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminCustomerList;
