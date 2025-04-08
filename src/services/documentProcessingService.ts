import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";
import { processDocumentWithAI } from "./aiProcessingService";
import { fetchProcessingResults } from "./processingResultsService";
import { getOcrLogs, getExtractionResult } from "./ocrLogsService";
import { processDocumentWithGoogleVision } from "./visionProcessingService";

// Re-export services to maintain backward compatibility
export const processDocumentWithOpenAI = processDocumentWithAI;
export const checkProcessingResults = fetchProcessingResults;
export const getDocumentOcrLogs = getOcrLogs;
export const getExtractionResultById = getExtractionResult;
export { processDocumentWithGoogleVision };

// Enhanced API connectivity check
export const checkApiConnectivity = async (): Promise<{ connected: boolean; details?: string }> => {
  try {
    console.log("🔍 Testing API connectivity to process-saps-document endpoint...");
    
    // First test with OPTIONS to see if the endpoint is accessible
    const response = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document',
      {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/json'
        },
        // Shorter timeout for connectivity check
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );
    
    console.log(`🌐 API connectivity check status: ${response.status}`);
    
    // If we get 204 or 200, we have connectivity
    if (response.status === 204 || response.ok) {
      return { connected: true };
    }
    
    // Otherwise, try to parse the error
    let errorDetails = "Unknown error";
    try {
      const errorText = await response.text();
      console.log("API error response:", errorText);
      
      // Check if the response is HTML (likely a Cloudflare or proxy error page)
      if (errorText.startsWith('<!DOCTYPE html>') || errorText.startsWith('<html>')) {
        errorDetails = "Received HTML error page instead of API response. This could indicate a network issue or Cloudflare blocking the request.";
      } else {
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.error || errorJson.message || errorText;
        } catch {
          // Not valid JSON, use the text directly
          errorDetails = errorText;
        }
      }
    } catch (parseError) {
      errorDetails = `Failed to parse error response: ${parseError.message}`;
    }
    
    console.error("❌ API connectivity failed:", errorDetails);
    return { connected: false, details: errorDetails };
  } catch (error) {
    console.error("❌ API connectivity check error:", error);
    return { 
      connected: false, 
      details: error instanceof Error ? error.message : "Unknown connection error" 
    };
  }
};

// New function to test Claude API specifically
export const testClaudeApiConnectivity = async (): Promise<{ connected: boolean; details?: string }> => {
  try {
    console.log("🔍 Testing Claude API connectivity...");
    
    // Get authentication token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { 
        connected: false, 
        details: "Nincs érvényes felhasználói munkamenet a Claude API teszteléséhez" 
      };
    }
    
    // Make a minimal test request to the process-saps-document endpoint
    const testResponse = await fetch(
      'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-saps-document',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testMode: true,
          userId: session.user.id
        }),
        signal: AbortSignal.timeout(15000) // 15 second timeout
      }
    );
    
    if (testResponse.ok) {
      return { connected: true };
    }
    
    // Handle different error responses
    let errorDetails = "Unknown error";
    try {
      const errorText = await testResponse.text();
      
      // Check if the response is HTML instead of JSON
      if (errorText.startsWith('<!DOCTYPE html>') || errorText.startsWith('<html>')) {
        errorDetails = "Received HTML error page instead of API response. This could indicate a network issue or Cloudflare blocking the request.";
      } else {
        try {
          // Try to parse as JSON
          const errorJson = JSON.parse(errorText);
          errorDetails = errorJson.error || errorJson.message || errorText;
        } catch {
          // Not valid JSON, use the text directly
          errorDetails = errorText;
        }
      }
    } catch (parseError) {
      errorDetails = `Failed to parse error response: ${parseError.message}`;
    }
    
    return { connected: false, details: errorDetails };
  } catch (error) {
    console.error("❌ Claude API connectivity test error:", error);
    return { 
      connected: false, 
      details: error instanceof Error ? error.message : "Unknown connection error to Claude API" 
    };
  }
};
