
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
import FarmInfoDisplay from "@/components/farm/FarmInfoDisplay";

const LoanApplication = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [farmData, setFarmData] = useState<FarmData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loanAmount, setLoanAmount] = useState(0);
  const [paymentFrequency, setPaymentFrequency] = useState("quarterly");
  const [preApprovedAmount, setPreApprovedAmount] = useState<number | undefined>(undefined);
  const [totalRevenue, setTotalRevenue] = useState<number | undefined>(undefined);
  
  // Get preApprovedAmount and totalRevenue from location state if available
  useEffect(() => {
    if (location.state) {
      const { preApprovedAmount, totalRevenue } = location.state as { 
        preApprovedAmount?: number;
        totalRevenue?: number;
      };
      
      if (preApprovedAmount) {
        setPreApprovedAmount(preApprovedAmount);
      }
      
      if (totalRevenue) {
        setTotalRevenue(totalRevenue);
        
        // If we have revenue data, we can create a minimal farmData object
        if (!farmData) {
          setFarmData({
            totalRevenue: totalRevenue,
            cultures: [],
            hectares: 0 // Added the required hectares property with a default value
          });
        }
      }
    }
  }, [location.state]);
  
  const handleFileUploadComplete = (data: FarmData) => {
    // Add verification for data quality before proceeding
    const hasValidData = data && (
      data.applicantName || 
      data.submitterId || 
      data.applicantId || 
      data.documentId
    );
    
    setFarmData(data);
    
    // Always move to step 2 (farm info display) after upload, even if data is incomplete
    setStep(2);
  };
  
  const handleNextStep = () => {
    setStep(step + 1);
  };
  
  const handleLoanTermsSubmit = (loanSettings: any) => {
    setLoanAmount(loanSettings.amount);
    setPaymentFrequency(loanSettings.paymentFrequency);
    handleNextStep(); // Automatically advance to the next step after submission
  };
  
  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };
  
  const renderStep = () => {
    switch (step) {
      case 1:
        // If we already have farm data from state, skip to step 2
        if (farmData && totalRevenue) {
          // Automatically move to next step if we have the data
          setTimeout(() => setStep(2), 0);
          return <div className="text-center p-8">Adatok betöltése...</div>;
        }
        return <FileUpload onComplete={handleFileUploadComplete} />;
      case 2:
        return <FarmInfoDisplay 
          farmData={farmData!} 
          onComplete={handleNextStep}
          onBackToDashboard={handleBackToDashboard}
        />;
      case 3:
        return <FarmLocation onComplete={handleNextStep} />;
      case 4:
        return <PersonalIdentification 
          userData={userData ?? undefined} 
          onNext={handleNextStep} 
        />;
      case 5:
        return <CreditScore 
          farmData={farmData!}
          creditLimit={preApprovedAmount || (farmData?.totalRevenue ? Math.round(farmData.totalRevenue * 0.7) : 0)}
          onComplete={handleNextStep} 
        />;
      case 6:
        return <LoanTerms 
          approvedAmount={preApprovedAmount || (farmData?.totalRevenue ? Math.round(farmData.totalRevenue * 0.7) : 1000000)}
          onComplete={handleNextStep}
          onSubmit={handleLoanTermsSubmit}
        />;
      case 7:
        return <ContractSigning 
          userData={userData ?? undefined}
          onNext={handleNextStep} 
        />;
      case 8:
        return <LoanComplete 
          userData={userData ?? undefined}
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
