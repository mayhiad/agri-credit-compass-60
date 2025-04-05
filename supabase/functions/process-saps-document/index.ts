
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";
import { processDocumentWithOpenAI } from "./processDocument.ts";

serve(async (req) => {
  // CORS kezelése
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log("📥 Kérés érkezett: URL:", req.url, "Metódus:", req.method);
    console.log("📤 Kérés fejlécek:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('Nem érkezett fájl');

    console.log("📄 Fájl fogadva:", file.name, "méret:", file.size, "típus:", file.type);
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    console.log("🔑 OpenAI API kulcs állapota:", openaiApiKey ? "beállítva (" + openaiApiKey.substring(0, 5) + "...)" : "hiányzik");

    // Felhasználói azonosító kinyerése a JWT tokenből vagy alapértelmezett használata
    let userId = 'debug_user';
    
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        // JWT token feldolgozása a userId kinyeréséhez
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
        // Folytatjuk az alapértelmezett userId-val
      }
    }

    const fileBuffer = await file.arrayBuffer();
    const processResult = await processDocumentWithOpenAI(fileBuffer, file.name, userId);

    return new Response(JSON.stringify(processResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Végső hibakezelés:", error);
    
    // Részletesebb hibaválasz küldése a frontendnek
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
