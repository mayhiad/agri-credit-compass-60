import { UserData } from "@/components/LoanApplication";

interface LoanCompleteProps {
  userData: UserData;
  loanAmount: number;
  paymentFrequency: string;
}

const LoanComplete = ({ userData, loanAmount, paymentFrequency }: LoanCompleteProps) => {
  const paymentFrequencyText = 
    paymentFrequency === "quarterly" ? "negyedéves" : 
    paymentFrequency === "biannual" ? "féléves" : "éves";
  const nextPaymentDate = getNextPaymentDate(paymentFrequency);
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <CardTitle>Sikeres kölcsönigénylés!</CardTitle>
        <CardDescription>
          A kölcsön folyósítása 24 órán belül megtörténik
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md bg-muted p-4">
          <div className="grid grid-cols-1 gap-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Név:</span>
              <span className="font-medium">{userData.lastName} {userData.firstName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Folyósított összeg:</span>
              <span className="font-medium">{formatCurrency(loanAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Törlesztési gyakoriság:</span>
              <span className="font-medium">{paymentFrequencyText}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Következő törlesztési dátum:</span>
              <span className="font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                {nextPaymentDate}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Button variant="outline" className="w-full flex items-center justify-center gap-2">
            <Download className="h-4 w-4" />
            Szerződés letöltése
          </Button>
          
          <Link to="/">
            <Button className="w-full">Vissza a főoldalra</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to get the next payment date based on frequency
function getNextPaymentDate(frequency: string): string {
  const now = new Date();
  let nextDate = new Date(now);
  
  if (frequency === "quarterly") {
    nextDate.setMonth(now.getMonth() + 3);
  } else if (frequency === "biannual") {
    nextDate.setMonth(now.getMonth() + 6);
  } else {
    // annual
    nextDate.setMonth(now.getMonth() + 12);
  }
  
  return nextDate.toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default LoanComplete;
