import { UserData } from "@/components/LoanApplication";

interface PersonalIdentificationProps {
  userData?: UserData;
  onNext: () => void;
}

const PersonalIdentification = ({ userData, onNext }: PersonalIdentificationProps) => {
  return (
    <div>
      <h2>Personal Identification</h2>
      {/* Display user data or form here */}
      <button onClick={onNext}>Next</button>
    </div>
  );
};

export default PersonalIdentification;
