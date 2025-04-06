
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Eye, Database, Code } from "lucide-react";
import { getDocumentOcrLogs, getExtractionResultById } from "@/services/documentProcessingService";
import { formatDistanceToNow } from "date-fns";
import { Separator } from "@/components/ui/separator";

const OcrLogViewer = () => {
  const [logs, setLogs] = useState([]);
  const [selectedLog, setSelectedLog] = useState(null);
  const [extractionResult, setExtractionResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    } finally {
      setLoading(false);
    }
  };

  const selectLog = async (log) => {
    setSelectedLog(log);
    
    try {
      setLoading(true);
      const result = await getExtractionResultById(log.id);
      setExtractionResult(result);
    } catch (err) {
      console.error("Feldolgozási eredmény betöltési hiba:", err);
      setExtractionResult(null);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Sikeres</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Sikertelen</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">Folyamatban</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Függőben</Badge>;
    }
  };

  const renderLogsList = () => (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">Dokumentum naplók</h3>
      {logs.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nincsenek dokumentum feldolgozási naplók.</p>
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
                  <p className="text-sm font-medium">{log.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(log.file_size)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderOcrContent = () => (
    <ScrollArea className="h-96 w-full rounded-md border p-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="text-sm font-medium">OCR Tartalom</h3>
          <p className="text-xs text-muted-foreground">
            {selectedLog?.ocr_content?.length || 0} karakter
          </p>
        </div>
        <Separator />
        {selectedLog?.ocr_content ? (
          <pre className="text-xs whitespace-pre-wrap font-mono">{selectedLog.ocr_content}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">Nincs elérhető OCR tartalom</p>
        )}
      </div>
    </ScrollArea>
  );

  const renderExtractionResult = () => (
    <ScrollArea className="h-96 w-full rounded-md border p-4">
      <div className="space-y-2">
        <div className="flex justify-between">
          <h3 className="text-sm font-medium">AI által kinyert adatok</h3>
          <div className="flex items-center gap-2">
            {extractionResult && getStatusBadge(extractionResult.processing_status)}
          </div>
        </div>
        <Separator />
        {extractionResult ? (
          <>
            <div className="flex justify-between mb-2">
              <div>
                <p className="text-xs text-muted-foreground">
                  Feldolgozási idő: {extractionResult.processing_time ? `${(extractionResult.processing_time / 1000).toFixed(1)} másodperc` : 'N/A'}
                </p>
              </div>
            </div>
            <pre className="text-xs whitespace-pre-wrap font-mono overflow-auto">
              {JSON.stringify(extractionResult.extracted_data, null, 2)}
            </pre>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nincs elérhető feldolgozási eredmény</p>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          SAPS Dokumentum OCR Naplók
        </CardTitle>
        <CardDescription>
          Az alkalmazásban feldolgozott SAPS dokumentumok OCR naplói és az AI által kinyert adatok.
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
                <Tabs defaultValue="ocr">
                  <TabsList className="mb-2">
                    <TabsTrigger value="ocr">
                      <Code className="h-4 w-4 mr-1" />
                      OCR Tartalom
                    </TabsTrigger>
                    <TabsTrigger value="extraction">
                      <Database className="h-4 w-4 mr-1" />
                      Feldolgozási Eredmény
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="ocr">
                    {renderOcrContent()}
                  </TabsContent>
                  <TabsContent value="extraction">
                    {renderExtractionResult()}
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="p-8 text-center border rounded-md">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Válasszon egy naplót a megtekintéshez</p>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OcrLogViewer;
