
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, CheckCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

interface TwoFactorAuthProps {
  email: string;
  phone?: string;
  onBack: () => void;
  onVerified: () => void;
}

const TwoFactorAuth = ({ email, phone, onBack, onVerified }: TwoFactorAuthProps) => {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleResendCode = async () => {
    setError(null);
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) throw error;
      
      toast.success("Ellenőrző kód újraküldve");
      setSuccess("Új ellenőrző kód került kiküldésre az e-mail címére.");
    } catch (error: any) {
      console.error("Resend error:", error);
      setError(error.message || "Hiba történt a kód újraküldése során");
      toast.error("Hiba történt a kód újraküldése során");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 6) {
      setError("Kérjük, adja meg a 6 számjegyű ellenőrző kódot");
      return;
    }
    
    setError(null);
    setLoading(true);
    
    try {
      // Implement the OTP verification logic with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });
      
      if (error) throw error;
      
      setSuccess("Sikeres azonosítás!");
      toast.success("Sikeres azonosítás!");
      onVerified();
    } catch (error: any) {
      console.error("Verification error:", error);
      setError(error.message || "Hibás ellenőrző kód");
      toast.error("Hibás ellenőrző kód");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Kétfaktoros azonosítás</CardTitle>
        <CardDescription>
          Ellenőrző kódot küldtünk a(z) {email} címre. Kérjük, adja meg a 6 számjegyű kódot a folytatáshoz.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-center my-6">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={handleVerify} 
          className="w-full" 
          disabled={loading || otp.length < 6}
        >
          {loading ? "Ellenőrzés..." : "Ellenőrzés"}
        </Button>
        
        <div className="text-center mt-4">
          <Button variant="link" onClick={handleResendCode} disabled={loading}>
            Nem kapta meg a kódot? Újraküldés
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-start border-t pt-4">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={loading}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TwoFactorAuth;
