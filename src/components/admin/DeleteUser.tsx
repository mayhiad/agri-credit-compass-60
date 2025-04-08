
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const DeleteUser = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDeleteUser = async () => {
    if (!email) {
      toast.error("Kérjük, adja meg az e-mail címet");
      return;
    }

    setLoading(true);
    try {
      // Get function URL from Supabase project
      const { data: fnUrl } = await supabase.functions.invoke("delete-user", {
        body: { email },
      });

      toast.success(`Felhasználó sikeresen törölve: ${email}`);
      setEmail("");
    } catch (error) {
      console.error("Error deleting user:", error);
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
          <Button 
            onClick={handleDeleteUser} 
            disabled={loading || !email}
            className="w-full"
          >
            {loading ? "Törlés folyamatban..." : "Felhasználó törlése"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default DeleteUser;
