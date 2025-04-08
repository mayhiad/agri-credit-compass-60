
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/App";
import LoanApplication from "@/components/LoanApplication";
import NavBar from "@/components/NavBar";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar />
      <div className="container mx-auto py-6">
        <LoanApplication />
      </div>
    </div>
  );
};

export default Index;
