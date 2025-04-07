
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

// CORS fejlécek beállítása
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS előkérések kezelése
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log("📥 Új API szolgáltatás meghívása");
    
    // API kulcs kinyerése a környezeti változókból
    const NEW_API_KEY = Deno.env.get('NEW_API_KEY');
    
    if (!NEW_API_KEY) {
      console.error("🔑 NEW_API_KEY környezeti változó nincs beállítva!");
      return new Response(JSON.stringify({
        success: false,
        error: "API kulcs nincs beállítva a Supabase Edge Function változók között"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Beérkező kérés adatainak kinyerése
    let requestData = {};
    
    if (req.method === 'POST') {
      try {
        const contentType = req.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          requestData = await req.json();
        } else if (contentType.includes('multipart/form-data')) {
          const formData = await req.formData();
          // FormData objektumot egyszerű JavaScript objektummá alakítjuk
          for (const [key, value] of formData.entries()) {
            requestData[key] = value;
          }
        }
      } catch (parseError) {
        console.error("Kérés adatainak feldolgozási hibája:", parseError);
        return new Response(JSON.stringify({
          success: false,
          error: "A kérés adatainak feldolgozása sikertelen"
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    
    // Példa API hívás - ezt módosíthatja a tényleges API hívás szerint
    const exampleApiEndpoint = "https://api.example.com/data";
    
    console.log("🔄 API hívás küldése a következő adatokkal:", JSON.stringify(requestData));
    
    const apiResponse = await fetch(exampleApiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NEW_API_KEY}`
      },
      body: JSON.stringify(requestData)
    });
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error(`API hiba: ${apiResponse.status} ${apiResponse.statusText}`);
      console.error("Hibaüzenet:", errorText);
      throw new Error(`API hiba: ${apiResponse.status} ${apiResponse.statusText} - ${errorText}`);
    }
    
    const result = await apiResponse.json();
    console.log("✅ API válasz:", JSON.stringify(result));

    return new Response(JSON.stringify({
      success: true,
      data: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Végső hibakezelés:", error);
    
    let errorMessage = "Ismeretlen hiba történt";
    let errorDetails = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.toString();
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage, 
      details: errorDetails
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
