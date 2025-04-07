
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { callNewApiService } from "@/services/newApiService";
import { toast } from "sonner";
import { AlertCircle, CheckCircle } from "lucide-react";

export const NewApiDemo = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const handleApiCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await callNewApiService({ query });
      
      if (!response.success) {
        throw new Error(response.error || "Hiba történt az API hívás során");
      }
      
      setResult(response.data);
      toast.success("API hívás sikeres!");
    } catch (err) {
      console.error("API hívási hiba:", err);
      setError(err instanceof Error ? err.message : "Ismeretlen hiba történt");
      toast.error("Hiba történt az API hívás során");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Új API Demó</CardTitle>
        <CardDescription>
          Az új API integrációnk tesztelése biztonságos módon
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid w-full items-center gap-4">
            <div className="flex flex-col space-y-1.5">
              <Input
                id="query"
                placeholder="Adjon meg egy lekérdezést..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription>
                <div className="mt-2">
                  <p className="text-sm font-medium text-green-800">Sikeres API hívás</p>
                  <pre className="mt-2 text-xs bg-white p-2 rounded border border-green-100 overflow-auto max-h-40">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleApiCall} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
              API hívás folyamatban...
            </span>
          ) : (
            "API meghívása"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NewApiDemo;
