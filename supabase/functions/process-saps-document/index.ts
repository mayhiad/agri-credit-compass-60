
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";
import { processDocumentWithOpenAI } from "./processDocument.ts";

serve(async (req) => {
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

    const fileBuffer = await file.arrayBuffer();
    const processResult = await processDocumentWithOpenAI(fileBuffer, file.name, 'debug_user');

    return new Response(JSON.stringify(processResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Végső hibakezelés:", error);
    return new Response(JSON.stringify({ 
      error: error.message, 
      details: error.toString(),
      stack: error.stack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
