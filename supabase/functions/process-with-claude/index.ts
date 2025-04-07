
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "../process-saps-document/cors.ts";

const API_TIMEOUT = 180000; // 3 minutes

serve(async (req) => {
  // Add initial log message
  console.log("📥 Claude AI feldolgozás indítása");

  // CORS handling
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log("📥 Kérés érkezett: URL:", req.url, "Metódus:", req.method);
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('Nem érkezett fájl');

    console.log("📄 Fájl fogadva:", file.name, "méret:", file.size, "típus:", file.type);
    
    // Get user ID from JWT token
    let userId = 'debug_user';
    
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        if (payload.sub) {
          userId = payload.sub;
          console.log("👤 Felhasználó azonosítva:", userId);
        }
      } catch (jwtError) {
        console.warn("⚠️ Nem sikerült a JWT tokent feldolgozni:", jwtError);
      }
    }

    // This is where we would process with Claude, but for now let's just return mock data
    // for testing until the Claude API is set up
    
    return new Response(JSON.stringify({
      success: true,
      message: "Claude API implementáció folyamatban. Jelenleg az OpenAI API-t használjuk."
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Végső hibakezelés:", error);
    
    let errorMessage = "Ismeretlen hiba történt";
    let errorDetails = "";
    let errorStack = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.toString();
      errorStack = error.stack || "";
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage, 
      details: errorDetails,
      stack: errorStack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
