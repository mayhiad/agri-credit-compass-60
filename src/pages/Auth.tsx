
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, ArrowRight, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TwoFactorAuth from "@/components/TwoFactorAuth";

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [currentTab, setCurrentTab] = useState("signin");
  
  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error("Session error:", error);
      }
      
      // If session exists, redirect to dashboard
      if (data.session) {
        console.log("User already authenticated, redirecting to dashboard");
        navigate("/dashboard");
      }
    };
    
    checkSession();
  }, [navigate]);
  
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (password !== confirmPassword) {
      setError("A jelszavak nem egyeznek");
      return;
    }
    
    setLoading(true);
    
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin + "/dashboard"
        }
      });
      
      if (signUpError) throw signUpError;
      
      // If we require email confirmation, show the verification message
      if (!data.session) {
        setSuccess("Regisztráció sikeres! Kérjük, ellenőrizze e-mail fiókját a megerősítő linkért.");
        toast.success("Regisztráció sikeres!");
      } else {
        // If 2FA is enabled, show the OTP verification
        setShowTwoFactor(true);
      }
      
      // If no 2FA and email confirmation is not enabled, redirect to dashboard
      if (data.session && !showTwoFactor) {
        // Clear any stored data before setting up the new session
        localStorage.removeItem('farmData');
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.message.includes("already registered")) {
        setError("Ez az e-mail cím már regisztrálva van. Kérjük jelentkezzen be!");
      } else {
        setError(error.message || "Hiba történt a regisztráció során");
      }
      toast.error("Hiba történt a regisztráció során");
    } finally {
      setLoading(false);
    }
  };
  
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    
    try {
      // Clear any stored data before attempting sign in
      localStorage.removeItem('farmData');
      
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (signInError) throw signInError;
      
      // Determine if we need 2FA verification
      if (data.session?.user?.factors && Object.keys(data.session.user.factors).length > 0) {
        setShowTwoFactor(true);
      } else {
        toast.success("Sikeres bejelentkezés!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Login error:", error);
      
      if (error.message.includes("Invalid login")) {
        setError("Hibás e-mail cím vagy jelszó");
      } else {
        setError(error.message || "Hiba történt a bejelentkezés során");
      }
      toast.error("Hiba történt a bejelentkezés során");
    } finally {
      setLoading(false);
    }
  };
  
  const handleTwoFactorVerified = () => {
    navigate("/dashboard");
  };
  
  // If showing 2FA, only display the 2FA component
  if (showTwoFactor) {
    return (
      <div className="container max-w-md mx-auto py-10">
        <TwoFactorAuth 
          email={email} 
          onBack={() => setShowTwoFactor(false)} 
          onVerified={handleTwoFactorVerified} 
        />
      </div>
    );
  }
  
  return (
    <div className="container max-w-md mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Fiók kezelés</CardTitle>
          <CardDescription>
            Jelentkezzen be vagy regisztráljon, hogy hozzáférjen a hiteligényléshez és a gazdasági adataihoz
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Bejelentkezés</TabsTrigger>
              <TabsTrigger value="signup">Regisztráció</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">E-mail cím</Label>
                  <Input 
                    id="signin-email" 
                    type="email" 
                    placeholder="pelda@email.hu" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="signin-password">Jelszó</Label>
                    <a href="#" className="text-xs text-primary hover:underline">
                      Elfelejtett jelszó?
                    </a>
                  </div>
                  <Input 
                    id="signin-password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Folyamatban..." : "Bejelentkezés"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">E-mail cím</Label>
                  <Input 
                    id="signup-email" 
                    type="email" 
                    placeholder="pelda@email.hu" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Jelszó</Label>
                  <Input 
                    id="signup-password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Jelszó megerősítése</Label>
                  <Input 
                    id="signup-confirm-password" 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
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
                  type="submit" 
                  className="w-full" 
                  disabled={loading}
                >
                  {loading ? "Folyamatban..." : "Regisztráció"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
