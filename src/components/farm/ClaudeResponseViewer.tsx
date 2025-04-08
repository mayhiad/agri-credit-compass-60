
import React, { useState, useEffect } from "react";
import { getClaudeResponseForOcrLog } from "@/services/documentProcessingService";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, ExternalLink } from "lucide-react";

interface ClaudeResponseViewerProps {
  ocrLogId: string | null;
}

const ClaudeResponseViewer: React.FC<ClaudeResponseViewerProps> = ({ ocrLogId }) => {
  const [claudeResponseUrl, setClaudeResponseUrl] = useState<string | null>(null);
  const [responseContent, setResponseContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  // Fetch Claude response URL when ocrLogId changes
  useEffect(() => {
    const fetchClaudeResponseUrl = async () => {
      if (!ocrLogId) return;
      
      try {
        const url = await getClaudeResponseForOcrLog(ocrLogId);
        setClaudeResponseUrl(url);
      } catch (err) {
        console.error("Hiba a Claude válasz URL lekérdezésekor:", err);
      }
    };
    
    fetchClaudeResponseUrl();
  }, [ocrLogId]);

  // Fetch response content when dialog is opened
  const fetchResponseContent = async () => {
    if (!claudeResponseUrl) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(claudeResponseUrl);
      if (!response.ok) {
        throw new Error(`HTTP hiba: ${response.status}`);
      }
      
      const text = await response.text();
      setResponseContent(text);
    } catch (err) {
      console.error("Hiba a Claude válasz tartalom betöltésekor:", err);
      setError("Nem sikerült betölteni a Claude válasz tartalmát. Kérjük, próbálja újra később.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setShowDialog(true);
    if (!responseContent) {
      fetchResponseContent();
    }
  };

  const handleOpenInNewTab = () => {
    if (claudeResponseUrl) {
      window.open(claudeResponseUrl, "_blank");
    }
  };

  if (!ocrLogId || !claudeResponseUrl) {
    return null;
  }

  return (
    <>
      <Button 
        variant="outline" 
        onClick={handleOpenDialog}
        className="flex items-center gap-2"
      >
        <span>Claude válasz megtekintése</span>
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Claude AI válasz</DialogTitle>
            <DialogDescription>
              A Claude AI által visszaadott nyers válasz megtekintése
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-end mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleOpenInNewTab}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Megnyitás új lapon</span>
            </Button>
          </div>
          
          <Separator />
          
          <ScrollArea className="flex-grow my-4">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-2">Válasz betöltése...</span>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-red-500">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchResponseContent} 
                  className="mt-2"
                >
                  Újrapróbálkozás
                </Button>
              </div>
            ) : responseContent ? (
              <pre className="text-xs whitespace-pre-wrap font-mono p-4">
                {responseContent}
              </pre>
            ) : (
              <div className="flex justify-center items-center h-full">
                <span>Nincs elérhető válasz</span>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ClaudeResponseViewer;
