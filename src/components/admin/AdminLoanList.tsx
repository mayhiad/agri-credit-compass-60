
import { useState, useEffect } from "react";
import { 
  Table, TableHeader, TableRow, TableHead, 
  TableBody, TableCell 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/lib/utils";

interface LoanWithDetails {
  id: string;
  contract_number: string | null;
  amount: number;
  interest_rate: number;
  payment_frequency: string;
  term_months: number;
  status: string;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    customer_id: string | null;
  } | null | { error: true };
}

interface AdminLoanListProps {
  isAdmin: boolean;
  isFinanceOfficer: boolean;
}

const AdminLoanList = ({ isAdmin, isFinanceOfficer }: AdminLoanListProps) => {
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLoans = async () => {
      try {
        const { data, error } = await supabase
          .from('loans')
          .select(`
            *,
            profiles:user_id (
              first_name,
              last_name,
              customer_id
            )
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          // Cast the data to the expected type since we know our interface accommodates the possible response formats
          setLoans(data as unknown as LoanWithDetails[]);
        } else {
          setLoans([]);
        }
      } catch (error) {
        console.error('Error fetching loans:', error);
        setLoans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLoans();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800">Jóváhagyásra vár</Badge>;
      case 'kiutalásra vár':
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Kiutalásra vár</Badge>;
      case 'kihelyezett hitelösszeg':
        return <Badge variant="outline" className="bg-green-100 text-green-800">Kihelyezett hitelösszeg</Badge>;
      case 'closed':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Lezárt</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredLoans = loans.filter(loan => {
    const searchLower = searchTerm.toLowerCase();
    
    // Handle possible error in profiles or null profiles
    if (!loan.profiles || 'error' in loan.profiles) {
      // If there's no profiles data or it's an error, only match by contract number
      const contractMatch = loan.contract_number?.toLowerCase().includes(searchLower) || false;
      return contractMatch && (!statusFilter || loan.status === statusFilter);
    }

    const matchesSearch = 
      (loan.contract_number?.toLowerCase().includes(searchLower)) ||
      (loan.profiles?.customer_id?.toLowerCase().includes(searchLower)) ||
      (loan.profiles?.first_name?.toLowerCase().includes(searchLower)) ||
      (loan.profiles?.last_name?.toLowerCase().includes(searchLower));
    
    const matchesStatus = !statusFilter || loan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const viewLoanDetails = (loanId: string) => {
    navigate(`/admin/loan/${loanId}`);
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
        <CardTitle>Hitelszerződések listája</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Keresés szerződésszám vagy ügyfél alapján..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="w-full sm:w-64">
            <Select
              value={statusFilter || ""}
              onValueChange={(value) => setStatusFilter(value || null)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Státusz szűrés" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Összes státusz</SelectItem>
                <SelectItem value="pending">Jóváhagyásra vár</SelectItem>
                <SelectItem value="kiutalásra vár">Kiutalásra vár</SelectItem>
                <SelectItem value="kihelyezett hitelösszeg">Kihelyezett hitelösszeg</SelectItem>
                <SelectItem value="closed">Lezárt</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Szerződésszám</TableHead>
                <TableHead>Ügyfél</TableHead>
                <TableHead>Összeg</TableHead>
                <TableHead>Státusz</TableHead>
                <TableHead>Létrehozás dátuma</TableHead>
                <TableHead>Műveletek</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.contract_number || '-'}</TableCell>
                    <TableCell>
                      {loan.profiles && !('error' in loan.profiles) ? (
                        <div>
                          <div>
                            {loan.profiles.last_name || ''} {loan.profiles.first_name || ''}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {loan.profiles.customer_id || ''}
                          </div>
                        </div>
                      ) : '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(loan.amount)}</TableCell>
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell>
                      {new Date(loan.created_at).toLocaleDateString('hu-HU')}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => viewLoanDetails(loan.id)}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        Részletek
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {searchTerm || statusFilter 
                      ? 'Nincs találat a keresési feltételekre.' 
                      : 'Nincsenek hitelszerződések.'}
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

export default AdminLoanList;
