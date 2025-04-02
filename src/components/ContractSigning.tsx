
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { FarmData, UserData } from "@/components/LoanApplication";
import { LoanSettings } from "@/components/LoanTerms";
import { useState } from "react";
import { FileText, CheckCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

interface ContractSigningProps {
  userData: UserData;
  farmData: FarmData;
  loanTerms: LoanSettings;
  onComplete: () => void;
}

export const ContractSigning = ({ userData, farmData, loanTerms, onComplete }: ContractSigningProps) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [dataProcessingAccepted, setDataProcessingAccepted] = useState(false);
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    if (!termsAccepted || !dataProcessingAccepted) {
      toast.error("Kérjük, fogadja el a feltételeket a folytatáshoz");
      return;
    }

    setSigning(true);
    // Simulate contract signing process
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setSigning(false);
    onComplete();
  };

  const paymentFrequencyText = loanTerms.paymentFrequency === "quarterly" ? "negyedéves" : "féléves";
  const numberOfPayments = loanTerms.paymentFrequency === "quarterly" ? 4 : 2;
  const paymentAmount = calculatePayment(loanTerms.amount, loanTerms.apr, numberOfPayments);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Kölcsönszerződés
        </CardTitle>
        <CardDescription>
          Kérjük, tekintse át a szerződés részleteit és írja alá az elfogadáshoz
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-md bg-muted p-4">
          <h3 className="font-semibold mb-2">Szerződő felek</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Kölcsönadó:</p>
              <p className="text-sm">Agri-Credit Compass Kft.</p>
              <p className="text-sm">1234 Budapest, Példa utca 1.</p>
              <p className="text-sm">Cégjegyzékszám: 01-09-123456</p>
            </div>
            <div>
              <p className="text-sm font-medium">Kölcsönvevő:</p>
              <p className="text-sm">{userData.lastName} {userData.firstName}</p>
              <p className="text-sm">{userData.address}</p>
              <p className="text-sm">Adóazonosító: {userData.taxId}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Kölcsön részletei</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Kölcsön összege:</div>
            <div className="font-medium text-right">{formatCurrency(loanTerms.amount)}</div>
            
            <div>THM:</div>
            <div className="font-medium text-right">{loanTerms.apr}%</div>
            
            <div>Futamidő:</div>
            <div className="font-medium text-right">1 év</div>
            
            <div>Törlesztési gyakoriság:</div>
            <div className="font-medium text-right">{paymentFrequencyText}</div>
            
            <div>Törlesztőrészlet:</div>
            <div className="font-medium text-right">{formatCurrency(paymentAmount)}</div>
            
            <div>Törlesztések száma:</div>
            <div className="font-medium text-right">{numberOfPayments}</div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">Gazdasági adatok alapja</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>Régió:</div>
            <div className="font-medium text-right">{farmData.region}</div>
            
            <div>Összes terület:</div>
            <div className="font-medium text-right">{farmData.hectares} ha</div>
            
            <div>Becsült éves árbevétel:</div>
            <div className="font-medium text-right">{formatCurrency(farmData.totalRevenue)}</div>
            
            <div>SAPS dokumentum azonosító:</div>
            <div className="font-medium text-right">{farmData.documentId}</div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <Checkbox 
              id="terms" 
              checked={termsAccepted} 
              onCheckedChange={() => setTermsAccepted(prev => !prev)} 
            />
            <div className="grid gap-1.5">
              <Label htmlFor="terms" className="text-sm font-medium leading-none">
                Elfogadom a szerződési feltételeket
              </Label>
              <p className="text-sm text-muted-foreground">
                Kijelentem, hogy a szerződés feltételeit elolvastam, megértettem és elfogadom.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox 
              id="dataProcessing" 
              checked={dataProcessingAccepted} 
              onCheckedChange={() => setDataProcessingAccepted(prev => !prev)} 
            />
            <div className="grid gap-1.5">
              <Label htmlFor="dataProcessing" className="text-sm font-medium leading-none">
                Hozzájárulok az adatkezeléshez
              </Label>
              <p className="text-sm text-muted-foreground">
                Hozzájárulok a személyes adataim kezeléséhez a kölcsönigénylés elbírálása és a szerződés teljesítése céljából.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSign}
          disabled={!termsAccepted || !dataProcessingAccepted || signing} 
          className="w-full"
        >
          {signing ? (
            <>Szerződés aláírása folyamatban...</>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Szerződés aláírása
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

// Helper function for calculating payment amount
function calculatePayment(amount: number, apr: number, numberOfPayments: number): number {
  const interest = (apr / 100) * amount;
  const totalAmount = amount + interest;
  return Math.ceil(totalAmount / numberOfPayments);
}

export default ContractSigning;
