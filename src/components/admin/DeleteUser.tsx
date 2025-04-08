
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const DeleteUser = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteUser = async () => {
    if (!email) {
      toast.error("Kérjük, adja meg az e-mail címet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { email },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Felhasználó sikeresen törölve: ${email}`);
        setEmail("");
      } else {
        throw new Error(data.error || "Ismeretlen hiba történt");
      }
    } catch (error: any) {
      console.error("Error deleting user:", error);
      setError(error.message || "Hiba történt a felhasználó törlésekor");
      toast.error("Hiba történt a felhasználó törlésekor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Felhasználó törlése</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Felhasználó e-mail címe
            </label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="felhasznalo@example.com"
            />
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            onClick={handleDeleteUser} 
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? "Törlés folyamatban..." : "Felhasználó törlése"}
          </Button>
          
          <p className="text-xs text-muted-foreground mt-4">
            Figyelem: A felhasználó törlésével az összes kapcsolódó adat (gazdaságok, hitelek, stb.)
            is törlődik. Ez a művelet nem vonható vissza!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeleteUser;
