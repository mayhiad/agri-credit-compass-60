
import { corsHeaders } from "./cors.ts";

// API kérési timeout ms-ben (30 másodperc)
export const API_TIMEOUT = 30000;

// Timeout-os fetch implementáció
export const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('API request timed out');
    }
    throw error;
  }
};

// Hibakezelő segédfüggvény
export function createErrorResponse(error: any, status = 500) {
  console.error("❌ Hiba:", JSON.stringify({
    status: error.status,
    message: error.message,
    type: error.type,
    code: error.code
  }));
  
  return new Response(JSON.stringify({ 
    error: error.message, 
    details: error.toString(),
    code: error.code
  }), { 
    status: status, 
    headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
  });
}
