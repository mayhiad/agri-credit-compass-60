
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { Loader2, Users, FileText, AlertCircle, CheckCircle, BanknoteIcon } from "lucide-react";

interface AdminDashboardProps {
  isAdmin: boolean;
  isFinanceOfficer: boolean;
}

const AdminDashboard = ({ isAdmin, isFinanceOfficer }: AdminDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalLoans: 0,
    pendingApproval: 0,
    pendingTransfer: 0,
    activeLoans: 0,
    totalLoanAmount: 0
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get customer count
        const { count: customerCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Get total loans
        const { count: loanCount } = await supabase
          .from('loans')
          .select('*', { count: 'exact', head: true });
        
        // Get pending approval loans
        const { count: pendingApprovalCount } = await supabase
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        // Get pending transfer loans
        const { count: pendingTransferCount } = await supabase
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'kiutalásra vár');
        
        // Get active loans
        const { count: activeLoansCount } = await supabase
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'kihelyezett hitelösszeg');
        
        // Get total loan amount
        const { data: loanData } = await supabase
          .from('loans')
          .select('amount')
          .not('status', 'eq', 'closed');

        const totalLoanAmount = loanData?.reduce((sum, loan) => sum + Number(loan.amount), 0) || 0;
        
        setStats({
          totalCustomers: customerCount || 0,
          totalLoans: loanCount || 0,
          pendingApproval: pendingApprovalCount || 0,
          pendingTransfer: pendingTransferCount || 0,
          activeLoans: activeLoansCount || 0,
          totalLoanAmount
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összes ügyfél</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Összes szerződés</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLoans}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktív hitelösszeg</CardTitle>
            <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalLoanAmount)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Szerződések státusza</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Státusz</TableHead>
                <TableHead>Darabszám</TableHead>
                <TableHead>Állapot</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Jóváhagyásra vár</TableCell>
                <TableCell>{stats.pendingApproval}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                    <span>Adminisztrátori ellenőrzés szükséges</span>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Kiutalásra vár</TableCell>
                <TableCell>{stats.pendingTransfer}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Pénzügyi jóváhagyás szükséges</span>
                  </div>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Aktív szerződés</TableCell>
                <TableCell>{stats.activeLoans}</TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    <span>Folyósított hitel</span>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
