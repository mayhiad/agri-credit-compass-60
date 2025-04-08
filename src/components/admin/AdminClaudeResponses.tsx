
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Eye, Database, MessageSquare, FileCode } from "lucide-react";
import { getDocumentOcrLogs, getClaudeResponseForOcrLog } from "@/services/documentProcessingService";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";

interface AdminClaudeResponsesProps {
  isAdmin: boolean;
  isFinanceOfficer: boolean;
}

const AdminClaudeResponses = ({ isAdmin, isFinanceOfficer }: AdminClaudeResponsesProps) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [claudeResponse, setClaudeResponse] = useState<string | null>(null);
  const [extractionResult, setExtractionResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseLoading, setResponseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getDocumentOcrLogs();
      setLogs(data);
      setError(null);
    } catch (err) {
      setError("Nem sikerült betölteni az OCR naplókat");
      console.error("Napló betöltési hiba:", err);
      toast({
        title: "Hiba",
        description: "OCR naplók betöltése sikertelen",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const selectLog = async (log: any) => {
    setSelectedLog(log);
    setClaudeResponse(null); // Reset previous response
    
    if (log && log.id) {
      loadClaudeResponse(log.id);
    }
  };

  const loadClaudeResponse = async (logId: string) => {
    try {
      setResponseLoading(true);
      const responseUrl = await getClaudeResponseForOcrLog(logId);
      
      if (!responseUrl) {
        toast({
          title: "Információ",
          description: "Nincs elérhető Claude válasz ehhez a naplóhoz",
        });
        return;
      }
      
      // Fetch the actual response content
      const response = await fetch(responseUrl);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      
      const text = await response.text();
      setClaudeResponse(text);
    } catch (err) {
      console.error("Claude válasz betöltési hiba:", err);
      toast({
        title: "Hiba",
        description: "Claude válasz betöltése sikertelen",
        variant: "destructive"
      });
    } finally {
      setResponseLoading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Ismeretlen méret";
    
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const renderLogsList = () => (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">Feldolgozott SAPS dokumentumok</h3>
      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nincsenek feldolgozott SAPS dokumentumok.</p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div 
              key={log.id}
              className={`p-3 border rounded-md cursor-pointer hover:bg-accent/50 flex justify-between 
                ${selectedLog?.id === log.id ? 'border-primary bg-accent/70' : 'border-border'}`}
              onClick={() => selectLog(log)}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">{log.file_name || "Ismeretlen fájl"}</p>
                  <p className="text-xs text-muted-foreground">
                    {log.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : "Ismeretlen időpont"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={log.claude_response_url ? "default" : "outline"} 
                  className={log.claude_response_url ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                >
                  {log.claude_response_url ? "Van Claude válasz" : "Nincs Claude válasz"}
                </Badge>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(log.file_size)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderClaudeContent = () => (
    <ScrollArea className="h-[60vh] w-full rounded-md border p-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Claude AI Válasz
          </h3>
          <p className="text-xs text-muted-foreground">
            {claudeResponse ? `${claudeResponse.length} karakter` : "0 karakter"}
          </p>
        </div>
        <Separator />
        {responseLoading ? (
          <div className="py-8 text-center">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full mx-auto mb-2"></div>
            <p className="text-sm">Claude válasz betöltése...</p>
          </div>
        ) : claudeResponse ? (
          <pre className="text-xs whitespace-pre-wrap font-mono">{claudeResponse}</pre>
        ) : (
          <div className="py-8 text-center text-amber-600">
            <MessageSquare className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Nincs elérhető Claude válasz</p>
            <p className="text-xs mt-2">
              Válasszon egy naplót a listából, amelynek van Claude válasza.
            </p>
          </div>
        )}
      </div>
    </ScrollArea>
  );

  if (!isAdmin && !isFinanceOfficer) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-600">
            <p>Nincs jogosultsága az admin eszközök használatához.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Claude AI Válaszok
        </CardTitle>
        <CardDescription>
          Feldolgozott SAPS dokumentumok Claude AI válaszainak megtekintése és elemzése, a promptolás javításához.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && !logs.length ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-primary rounded-full"></div>
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-600">
            <p>{error}</p>
            <Button onClick={loadLogs} variant="outline" size="sm" className="mt-2">
              Újrapróbálkozás
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              {renderLogsList()}
              <div className="flex justify-end">
                <Button onClick={loadLogs} size="sm" variant="outline" className="gap-1">
                  <Eye className="h-4 w-4" />
                  Frissítés
                </Button>
              </div>
            </div>
            
            <div className="md:col-span-2">
              {selectedLog ? (
                renderClaudeContent()
              ) : (
                <div className="p-8 text-center border rounded-md h-96 flex flex-col justify-center items-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Válasszon egy naplót a Claude válasz megtekintéséhez</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminClaudeResponses;
