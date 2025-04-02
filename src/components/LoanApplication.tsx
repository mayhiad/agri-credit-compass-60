
import { useState, useEffect } from "react";
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
import { useSearchParams } from "react-router-dom";
import { ParcelData } from "@/services/sapsProcessor";

export interface MarketPrice {
  culture: string;
  averageYield: number;
  price: number;
  trend: number;
  lastUpdated: Date;
}

export type FarmData = {
  hectares: number;
  cultures: Array<{ name: string; hectares: number; estimatedRevenue: number }>;
  totalRevenue: number;
  region: string;
  documentId: string;
  applicantName?: string;
  // Új, részletes adatok
  blockIds?: string[];
  parcels?: ParcelData[];
  marketPrices?: MarketPrice[];
  year?: string; // Új mező az évszám tárolására
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
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<ApplicationStep>("upload");
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [creditLimit, setCreditLimit] = useState<number>(0);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loanTerms, setLoanTerms] = useState<LoanSettings | null>(null);

  useEffect(() => {
    // Check if there's a step query parameter and farm data in localStorage
    const urlStep = searchParams.get("step");
    const storedFarmData = localStorage.getItem("farmData");
    
    if (urlStep === "loan-terms" && storedFarmData) {
      try {
        // Parse stored farm data
        const parsedFarmData = JSON.parse(storedFarmData);
        setFarmData(parsedFarmData);
        
        // Calculate credit limit
        const calculatedCreditLimit = Math.round(parsedFarmData.totalRevenue * 0.4);
        setCreditLimit(calculatedCreditLimit);
        
        // Skip directly to loan terms
        setStep("loan-terms");
        
        toast({
          title: "Hiteligénylés folytatása",
          description: "A gazdasági adatok betöltésre kerültek.",
        });
      } catch (error) {
        console.error("Error parsing stored farm data:", error);
      }
    }
  }, [searchParams, toast]);

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
    // Clear the stored farm data after completing the process
    localStorage.removeItem("farmData");
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
        return <PersonalIdentification 
                onComplete={handleIdentificationComplete}
                farmData={farmData ? {
                  documentId: farmData.documentId,
                  applicantName: farmData.applicantName
                } : undefined}
              />;
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
