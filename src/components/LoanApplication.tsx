
import { useState } from "react";
import FileUpload from "@/components/FileUpload";
import Steps from "@/components/Steps";
import CreditScore from "@/components/CreditScore";
import FarmInfo from "@/components/FarmInfo";
import LoanTerms from "@/components/LoanTerms";
import PersonalIdentification from "@/components/PersonalIdentification";
import FarmLocation from "@/components/FarmLocation";
import ContractSigning from "@/components/ContractSigning";
import LoanComplete from "@/components/LoanComplete";

export interface Culture {
  name: string;
  hectares: number;
  yieldPerHectare?: number;
  pricePerTon?: number;
  estimatedRevenue?: number;
}

export interface MarketPrice {
  culture: string;
  averageYield: number;
  price: number;
  trend: number;
  lastUpdated: string | Date;
}

export interface FarmData {
  farmId?: string;
  fileName?: string;
  fileSize?: number;
  applicantName?: string;
  documentId?: string;
  region?: string;
  year?: string;
  hectares: number;
  cultures: Culture[];
  blockIds?: string[];
  totalRevenue: number;
  errorMessage?: string;
  ocrText?: string;
  wordDocumentUrl?: string;
  submitterId?: string;
  applicantId?: string;
  rawText?: string;
  marketPrices?: MarketPrice[];
  documentDate?: string;
  parcels?: any[];
}

export interface UserData {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  taxId?: string;
}

const LoanApplication = () => {
  const [step, setStep] = useState(1);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  
  const handleFileUploadComplete = (data: FarmData) => {
    setFarmData(data);
    setStep(2);
  };
  
  const handleNextStep = () => {
    setStep(step + 1);
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        return <FileUpload onComplete={handleFileUploadComplete} />;
      case 2:
        return <FarmInfo 
          farmData={farmData} 
          onNext={handleNextStep} 
        />;
      case 3:
        return <FarmLocation onNext={handleNextStep} />;
      case 4:
        return <PersonalIdentification 
          userData={userData} 
          onNext={handleNextStep} 
        />;
      case 5:
        return <CreditScore onNext={handleNextStep} />;
      case 6:
        return <LoanTerms onNext={handleNextStep} />;
      case 7:
        return <ContractSigning 
          userData={userData}
          onNext={handleNextStep} 
        />;
      case 8:
        return <LoanComplete 
          userData={userData}
          loanAmount={0}
          paymentFrequency="monthly"
        />;
      default:
        return <FileUpload onComplete={handleFileUploadComplete} />;
    }
  };
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <Steps 
        currentStep={step}
        steps={["Dokumentum", "Gazdaság", "Helyszín", "Személyes", "Hitelpontszám", "Feltételek", "Szerződés", "Kész"]}
      />
      <div className="mt-6">
        {renderStep()}
      </div>
    </div>
  );
};

export default LoanApplication;
