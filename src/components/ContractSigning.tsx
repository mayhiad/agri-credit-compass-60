import { UserData } from "@/components/LoanApplication";

interface ContractSigningProps {
  userData?: UserData;
  onNext: () => void;
}

const ContractSigning = ({ userData, onNext }: ContractSigningProps) => {
  return (
    <div>
      <h2>Szerződéskötés</h2>
      <p>Szerződéskötési folyamat...</p>
      <button onClick={onNext}>Tovább</button>
    </div>
  );
};

export default ContractSigning;
