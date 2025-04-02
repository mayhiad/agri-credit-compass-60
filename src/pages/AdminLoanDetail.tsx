import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { ArrowLeft, Loader2, Upload } from "lucide-react";
import { useAuth } from "@/App";
import { toast } from "sonner";

interface Loan {
  id: string;
  contract_number: string | null;
  amount: number;
  interest_rate: number;
  payment_frequency: string;
  term_months: number;
  status: string;
  created_at: string;
  contract_signed: boolean;
  farm_id: string;
}

interface Customer {
  id: string;
  first_name: string | null;
  last_name: string | null;
  customer_id: string | null;
  tax_id: string | null;
  phone: string | null;
  address: string | null;
  bank_account: string | null;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  document_url: string | null;
  created_at: string;
}

const AdminLoanDetail = () => {
  const { loanId } = useParams<{ loanId: string }>();
  const { user, loading: authLoading } = useAuth();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isFinanceOfficer, setIsFinanceOfficer] = useState(false);
  const [newStatus, setNewStatus] = useState<string>("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  
  const navigate = useNavigate();
  
  useEffect(() => {
    const checkPermissionAndFetchData = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Check if user has admin role using the custom function
        const { data: adminRoleData, error: adminError } = await supabase.rpc('is_admin');
        
        if (adminError) throw adminError;
        setIsAdmin(!!adminRoleData);
        
        // Check if user has finance officer role using the custom function
        const { data: financeRoleData, error: financeError } = await supabase.rpc('is_finance_officer');
        
        if (financeError) throw financeError;
        setIsFinanceOfficer(!!financeRoleData);
        
        if (!adminRoleData && !financeRoleData) {
          // User doesn't have permission
          navigate('/');
          return;
        }
        
        if (!loanId) {
          navigate('/admin');
          return;
        }
        
        // Fetch loan details
        const { data: loanData, error: loanError } = await supabase
          .from('loans')
          .select(`
            *,
            profiles:user_id (
              *
            )
          `)
          .eq('id', loanId)
          .single();
        
        if (loanError) throw loanError;
        
        if (loanData) {
          setLoan(loanData as Loan);
          setNewStatus(loanData.status);
          
          if (loanData.profiles) {
            setCustomer(loanData.profiles as unknown as Customer);
          }
        }
        
        // Fetch loan payments
        const { data: paymentData, error: paymentError } = await supabase
          .from('loan_payments')
          .select('*')
          .eq('loan_id', loanId)
          .order('payment_date', { ascending: true });
        
        if (paymentError) throw paymentError;
        if (paymentData) {
          setPayments(paymentData as Payment[]);
        }
        
      } catch (error) {
        console.error('Error fetching loan data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      checkPermissionAndFetchData();
    }
  }, [loanId, user, authLoading, navigate]);
  
  const updateLoanStatus = async () => {
    if (!loan || newStatus === loan.status) return;
    
    setStatusLoading(true);
    try {
      const { error } = await supabase
        .from('loans')
        .update({ status: newStatus })
        .eq('id', loan.id);
      
      if (error) throw error;
      
      // Update local state
      setLoan({ ...loan, status: newStatus });
      toast.success("Hitelszerződés státusza sikeresen frissítve!");
    } catch (error) {
      console.error('Error updating loan status:', error);
      toast.error("Hiba történt a státusz frissítésekor!");
    } finally {
      setStatusLoading(false);
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };
  
  const addPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loan || !user || !paymentAmount || paymentAmount <= 0) {
      toast.error("Kérem adja meg a törlesztés összegét!");
      return;
    }
    
    setUploadLoading(true);
    try {
      let documentUrl = null;
      
      // Upload document if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `payments/${loan.id}/${fileName}`;
        
        const { error: uploadError } = await supabase
          .storage
          .from('documents')
          .upload(filePath, file);
        
        if (uploadError) throw uploadError;
        
        // Get public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('documents')
          .getPublicUrl(filePath);
        
        documentUrl = publicUrl;
      }
      
      // Add payment record
      const { data, error } = await supabase
        .from('loan_payments')
        .insert({
          loan_id: loan.id,
          amount: paymentAmount,
          document_url: documentUrl,
          created_by: user.id
        })
        .select();
      
      if (error) throw error;
      
      // Update payments list
      if (data) {
        setPayments([...payments, data[0] as Payment]);
      }
      setPaymentAmount(0);
      setFile(null);
      
      toast.success("Törlesztés sikeresen rögzítve!");
    } catch (error) {
      console.error('Error adding payment:', error);
      toast.error("Hiba történt a törlesztés rögzítésekor!");
    } finally {
      setUploadLoading(false);
    }
  };
  
  if (loading || authLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!loan || !customer) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Hitelszerződés nem található</h1>
        <Button onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az admin felületre
        </Button>
      </div>
    );
  }

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'pending': return 'Jóváhagyásra vár';
      case 'kiutalásra vár': return 'Kiutalásra vár';
      case 'kihelyezett hitelösszeg': return 'Kihelyezett hitelösszeg';
      case 'closed': return 'Lezárt';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">Jóváhagyásra vár</span>;
      case 'kiutalásra vár':
        return <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800">Kiutalásra vár</span>;
      case 'kihelyezett hitelösszeg':
        return <span className="px-2 py-1 rounded-full bg-green-100 text-green-800">Kihelyezett hitelösszeg</span>;
      case 'closed':
        return <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800">Lezárt</span>;
      default:
        return <span className="px-2 py-1 rounded-full bg-gray-100">{status}</span>;
    }
  };
  
  // Calculate remaining amount to repay
  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remainingAmount = loan.amount - totalPaid;

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center mb-6 gap-4">
        <Button variant="outline" onClick={() => navigate('/admin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az admin felületre
        </Button>
        <h1 className="text-3xl font-bold">
          Hitelszerződés részletek
        </h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Szerződés adatok</CardTitle>
              <CardDescription>
                Szerződésszám: {loan.contract_number || 'Nincs megadva'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Hitelösszeg</h3>
                  <p className="font-semibold">{formatCurrency(loan.amount)}</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Kamatláb</h3>
                  <p>{loan.interest_rate}%</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Futamidő</h3>
                  <p>{loan.term_months} hónap</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Fizetési gyakoriság</h3>
                  <p>{
                    loan.payment_frequency === 'quarterly' ? 'Negyedéves' :
                    loan.payment_frequency === 'biannual' ? 'Féléves' :
                    loan.payment_frequency === 'annual' ? 'Éves' : 
                    loan.payment_frequency
                  }</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Létrehozás dátuma</h3>
                  <p>{new Date(loan.created_at).toLocaleDateString('hu-HU')}</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground mb-1">Szerződés állapot</h3>
                  <p>{loan.contract_signed ? 'Aláírva' : 'Nincs aláírva'}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Jelenlegi státusz</h3>
                <div className="mt-1">
                  {getStatusBadge(loan.status)}
                </div>
              </div>
              
              {(isAdmin || isFinanceOfficer) && (
                <div className="border p-4 rounded-lg bg-gray-50">
                  <h3 className="font-medium mb-2">Státusz módosítása</h3>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Select 
                        value={newStatus} 
                        onValueChange={setNewStatus}
                        disabled={statusLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Válassz státuszt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Jóváhagyásra vár</SelectItem>
                          <SelectItem value="kiutalásra vár">Kiutalásra vár</SelectItem>
                          <SelectItem value="kihelyezett hitelösszeg">Kihelyezett hitelösszeg</SelectItem>
                          <SelectItem value="closed">Lezárt</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={updateLoanStatus} 
                      disabled={statusLoading || newStatus === loan.status}
                    >
                      {statusLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Státusz frissítése
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Törlesztések</CardTitle>
              <CardDescription>
                Eddig törlesztett: {formatCurrency(totalPaid)} | Hátralévő: {formatCurrency(remainingAmount)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dátum</TableHead>
                      <TableHead>Összeg</TableHead>
                      <TableHead>Bizonylat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.payment_date).toLocaleDateString('hu-HU')}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>
                          {payment.document_url ? (
                            <a 
                              href={payment.document_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Bizonylat megtekintése
                            </a>
                          ) : 'Nincs feltöltve'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p>Nincs rögzített törlesztés.</p>
              )}
            </CardContent>
            
            {isFinanceOfficer && loan.status === 'kihelyezett hitelösszeg' && (
                <CardFooter className="flex flex-col">
                  <div className="w-full border-t pt-4 mt-2">
                    <h3 className="font-semibold mb-3">Új törlesztés rögzítése</h3>
                    <form onSubmit={addPayment} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment-amount">Törlesztés összege (Ft)</Label>
                          <Input
                            id="payment-amount"
                            type="number"
                            placeholder="Törlesztés összege"
                            value={paymentAmount || ''}
                            onChange={(e) => setPaymentAmount(Number(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-document">Banki bizonylat (opcionális)</Label>
                          <Input
                            id="payment-document"
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={handleFileChange}
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={!paymentAmount || paymentAmount <= 0 || uploadLoading}>
                        {uploadLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Törlesztés rögzítése
                      </Button>
                    </form>
                  </div>
                </CardFooter>
              )}
          </Card>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Ügyfél adatok</CardTitle>
              <CardDescription>
                Ügyfélszám: {customer.customer_id || 'Nincs megadva'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Név</h3>
                <p>{customer.last_name || ''} {customer.first_name || ''}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Adószám</h3>
                <p>{customer.tax_id || 'Nincs megadva'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Telefonszám</h3>
                <p>{customer.phone || 'Nincs megadva'}</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm text-muted-foreground mb-1">Bankszámlaszám</h3>
                <p>{customer.bank_account || 'Nincs megadva'}</p>
              </div>
              
              <div className="pt-4">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate(`/admin/customer/${customer.id}`)}
                >
                  Ügyfél részletes adatai
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminLoanDetail;
