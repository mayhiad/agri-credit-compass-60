import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Steps } from "@/components/Steps";
import { FileUpload } from "@/components/FileUpload";
import { FarmInfo, FarmInfoDisplay } from "@/components/FarmInfo";
import { CreditScore } from "@/components/CreditScore";
import { PersonalIdentification } from "@/components/PersonalIdentification";
import { LoanTerms, LoanSettings } from "@/components/LoanTerms";
import { ContractSigning } from "@/components/ContractSigning";
import { LoanComplete } from "@/components/LoanComplete";
import { useToast } from "@/components/ui/use-toast";

export type FarmData = {
  hectares: number;
  cultures: Array<{ name: string; hectares: number; estimatedRevenue: number }>;
  totalRevenue: number;
  region: string;
  documentId: string;
};

export type UserData = {
  firstName: string;
  lastName: string;
  idNumber: string;
  taxId: string;
  address: string;
  email: string;
  phone: string;
  verified: boolean;
};

type ApplicationStep = 
  | "upload" 
  | "farm-info" 
  | "credit-score"
  | "loan-terms"
  | "identification"
  | "contract"
  | "complete";

export const LoanApplication = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<ApplicationStep>("upload");
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loanTerms, setLoanTerms] = useState<LoanSettings | null>(null);

  const handleFileUploadComplete = (data: FarmData) => {
    setFarmData(data);
    setStep("farm-info");
    toast({
      title: "SAPS dokumentum feltöltve",
      description: "A gazdasági adatok elemzése megtörtént.",
    });
  };

  const handleFarmInfoComplete = () => {
    if (farmData) {
      const calculatedCreditLimit = Math.round(farmData.totalRevenue * 0.4);
      setCreditLimit(calculatedCreditLimit);
      setStep("credit-score");
      toast({
        title: "Gazdasági adatok jóváhagyva",
        description: "A hitelezési pontszám kiszámítása megtörtént.",
      });
    }
  };

  const handleCreditScoreComplete = () => {
    setStep("loan-terms");
  };

  const handleLoanTermsComplete = (settings: LoanSettings) => {
    setLoanTerms(settings);
    setStep("identification");
  };

  const handleIdentificationComplete = (userData: UserData) => {
    setUserData(userData);
    setStep("contract");
    toast({
      title: "Azonosítás sikeres",
      description: "Személyazonosság ellenőrizve.",
    });
  };

  const handleContractComplete = () => {
    setStep("complete");
    toast({
      title: "Szerződés aláírva",
      description: "A kölcsön folyósítása folyamatban van.",
    });
  };

  const renderCurrentStep = () => {
    switch (step) {
      case "upload":
        return <FileUpload onComplete={handleFileUploadComplete} />;
      case "farm-info":
        return (
          farmData && (
            <FarmInfoDisplay farmData={farmData} onComplete={handleFarmInfoComplete} />
          )
        );
      case "credit-score":
        return (
          farmData && (
            <CreditScore 
              farmData={farmData} 
              creditLimit={creditLimit} 
              onComplete={handleCreditScoreComplete} 
            />
          )
        );
      case "loan-terms":
        return <LoanTerms approvedAmount={creditLimit} onSubmit={handleLoanTermsComplete} />;
      case "identification":
        return <PersonalIdentification onComplete={handleIdentificationComplete} />;
      case "contract":
        return (
          userData && farmData && loanTerms && (
            <ContractSigning 
              userData={userData}
              farmData={farmData}
              loanTerms={loanTerms}
              onComplete={handleContractComplete}
            />
          )
        );
      case "complete":
        return (
          userData && loanTerms && (
            <LoanComplete 
              userData={userData}
              loanAmount={loanTerms.amount}
              paymentFrequency={loanTerms.paymentFrequency}
            />
          )
        );
      default:
        return <div>Ismeretlen lépés</div>;
    }
  };

  const currentStepIndex = [
    "upload",
    "farm-info",
    "credit-score",
    "loan-terms",
    "identification",
    "contract",
    "complete",
  ].indexOf(step);

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <Steps
        steps={[
          "SAPS feltöltés",
          "Gazdasági adatok",
          "Hitelkeret",
          "Kölcsön feltételek",
          "Azonosítás",
          "Szerződéskötés",
          "Folyósítás",
        ]}
        currentStep={currentStepIndex}
      />
      <div className="mt-8">{renderCurrentStep()}</div>
    </div>
  );
};

export default LoanApplication;
