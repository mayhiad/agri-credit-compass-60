
import React from "react";
import { FileWarning, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ErrorDisplayProps {
  message: string | null;
  onRetry?: () => void;
}

export const ErrorDisplay = ({ message, onRetry }: ErrorDisplayProps) => {
  if (!message) return null;

  // Speciális hibaüzenetek kezelése
  const isNetworkError = message.includes("Hálózati kapcsolati hiba") || 
                        message.includes("Failed to fetch") ||
                        message.includes("nem elérhető");
  
  const isTimeoutError = message.includes("időtúllépés") || 
                         message.includes("túl sokáig tartott");
  
  const isParsingError = message.includes("feldolgozása sikertelen") ||
                         message.includes("Nem sikerült kinyerni");
  
  return (
    <Alert variant="destructive" className="mt-4 bg-red-50 border border-red-200 rounded-md text-red-600">
      <div className="flex items-start">
        {isNetworkError ? (
          <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
        ) : isTimeoutError ? (
          <RefreshCw className="h-5 w-5 mr-2 flex-shrink-0" />
        ) : (
          <FileWarning className="h-5 w-5 mr-2 flex-shrink-0" />
        )}
        
        <div className="flex-1">
          <AlertTitle className="text-sm font-semibold mb-1">
            {isNetworkError ? "Hálózati kapcsolódási hiba" : 
             isTimeoutError ? "Időtúllépési hiba" : 
             isParsingError ? "Feldolgozási hiba" : "Hiba történt"}
          </AlertTitle>
          
          <AlertDescription className="text-sm">
            {message}
            
            {isNetworkError && (
              <div className="mt-2 text-xs">
                <p>Lehetséges okok:</p>
                <ul className="list-disc pl-4 mt-1">
                  <li>Az internet kapcsolat megszakadt</li>
                  <li>A Claude AI szolgáltatás átmenetileg nem elérhető</li>
                  <li>A Supabase Edge Function nem válaszol</li>
                </ul>
              </div>
            )}
          </AlertDescription>
          
          {onRetry && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2 bg-white border-red-200 hover:bg-red-50 text-red-600"
              onClick={onRetry}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Újrapróbálkozás
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default ErrorDisplay;
