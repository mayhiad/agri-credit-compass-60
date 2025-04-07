
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import LoanApplication from "@/components/LoanApplication";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return <LoanApplication />;
};

export default Index;
