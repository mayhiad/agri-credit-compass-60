
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DebuggingInfoProps {
  userId: string;
}

const DebuggingInfo = ({ userId }: DebuggingInfoProps) => {
  const [userFarms, setUserFarms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  const fetchUserFarms = async () => {
    setLoading(true);
    try {
      // Lekérjük az összes farmot ami a felhasználóhoz tartozik
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        console.error("Hiba a farm adatok lekérésekor:", error);
        toast.error("Nem sikerült lekérni a farm adatokat");
        return;
      }
      
      setUserFarms(data || []);
    } catch (error) {
      console.error("Váratlan hiba:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearData = async () => {
    if (!confirm("Biztosan törölni szeretnéd a felhasználó összes farm adatát?")) {
      return;
    }
    
    try {
      // Töröljük az összes farmot ami a felhasználóhoz tartozik
      const { error } = await supabase
        .from('farms')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        console.error("Hiba a farm adatok törlésekor:", error);
        toast.error("Nem sikerült törölni a farm adatokat");
        return;
      }
      
      toast.success("Sikeresen törölve az összes farm adat");
      // Frissítsük az adatokat
      fetchUserFarms();
      // Frissítsük az oldalt
      window.location.reload();
    } catch (error) {
      console.error("Váratlan hiba:", error);
    }
  };
  
  useEffect(() => {
    if (showDebug) {
      fetchUserFarms();
    }
  }, [userId, showDebug]);
  
  if (!showDebug) {
    return (
      <div className="mt-6 text-center">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebug(true)}
        >
          Debug információk megjelenítése
        </Button>
      </div>
    );
  }
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-lg">Debug információk</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-1">Felhasználó azonosító:</h4>
            <p className="text-sm font-mono bg-muted p-2 rounded">{userId}</p>
          </div>
          
          <div>
            <h4 className="font-medium mb-1">Társított farmok ({userFarms.length}):</h4>
            {loading ? (
              <p>Betöltés...</p>
            ) : userFarms.length > 0 ? (
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-48">
                {JSON.stringify(userFarms, null, 2)}
              </pre>
            ) : (
              <p className="text-sm">Nincsenek farm adatok társítva a felhasználóhoz</p>
            )}
          </div>
          
          <div className="pt-4 border-t">
            <Button 
              variant="destructive" 
              size="sm"
              onClick={handleClearData}
              disabled={loading || userFarms.length === 0}
            >
              Felhasználó farm adatainak törlése
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DebuggingInfo;
