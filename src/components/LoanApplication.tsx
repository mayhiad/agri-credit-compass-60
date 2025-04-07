
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
import { FarmData, UserData } from "@/types/farm";

// Use types from centralized types file rather than redefining them here
const LoanApplication = () => {
  const [step, setStep] = useState(1);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loanAmount, setLoanAmount] = useState(0);
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");
  
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
          onComplete={handleNextStep} 
        />;
      case 3:
        return <FarmLocation onComplete={handleNextStep} />;
      case 4:
        return <PersonalIdentification 
          userData={userData} 
          onNext={handleNextStep} 
        />;
      case 5:
        return <CreditScore 
          farmData={farmData}
          creditLimit={0}
          onComplete={handleNextStep} 
        />;
      case 6:
        return <LoanTerms 
          loanAmount={loanAmount}
          setLoanAmount={setLoanAmount}
          paymentFrequency={paymentFrequency}
          setPaymentFrequency={setPaymentFrequency}
          onComplete={handleNextStep} 
        />;
      case 7:
        return <ContractSigning 
          userData={userData}
          onNext={handleNextStep} 
        />;
      case 8:
        return <LoanComplete 
          userData={userData}
          loanAmount={loanAmount}
          paymentFrequency={paymentFrequency}
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
