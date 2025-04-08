
import { Toaster } from "@/components/ui/toaster";
// We're only going to use one toaster - shadcn's Toaster (not Sonner)
// import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { createContext, useContext, useEffect, useState } from "react";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import AdminAuth from "./pages/AdminAuth";
import AdminCustomerDetail from "./pages/AdminCustomerDetail";
import AdminLoanDetail from "./pages/AdminLoanDetail";
import AdminMarketPrices from "./pages/AdminMarketPrices";
import LoanApplication from "./components/LoanApplication";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

// Create auth context to share auth state across components
export type AuthContextType = {
  session: any | null;
  user: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  signOut: async () => {}
});

export const useAuth = () => useContext(AuthContext);

const App = () => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Centralized sign out function to ensure consistent behavior
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear auth state
      setSession(null);
      setUser(null);
      
      // Force a full page reload to ensure clean state
      window.location.href = "/";
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  // Initialize auth and set up listener for auth changes
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // First check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ session, user, loading, signOut }}>
        <Toaster />
        {/* Remove the second toaster to avoid conflicts */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={
              user ? <Navigate to="/dashboard" /> : <Auth />
            } />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/loan-application" element={<LoanApplication />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/auth" element={<AdminAuth />} />
            <Route path="/admin/customer/:customerId" element={<AdminCustomerDetail />} />
            <Route path="/admin/loan/:loanId" element={<AdminLoanDetail />} />
            <Route path="/admin/market-prices" element={<AdminMarketPrices />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

export default App;
