
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { SupabaseClient, createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS kezelése
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    console.log("📥 Google Vision OCR feldolgozási kérés érkezett!");
    
    // Google Cloud API kulcs
    const googleVisionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
    if (!googleVisionApiKey) {
      throw new Error("A Google Vision API kulcs nincs beállítva");
    }
    
    // Supabase hozzáférés
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Felhasználói azonosító kinyerése a JWT tokenből
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
        userId = payload.sub || 'debug_user';
        console.log("👤 Felhasználó azonosítva:", userId);
      } catch (jwtError) {
        console.warn("⚠️ JWT token feldolgozási hiba:", jwtError);
      }
    }
    
    // Fájl adatok kinyerése
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error("Nem érkezett fájl");
    }
    
    console.log("📄 Fájl fogadva:", file.name, "méret:", file.size, "típus:", file.type);
    
    // PDF vagy image feldolgozása
    const isImage = /^image\//.test(file.type);
    const isPdf = file.type === 'application/pdf';
    
    if (!isPdf && !isImage) {
      throw new Error("Csak PDF és kép fájlok támogatottak");
    }
    
    // Feldolgozás Google Vision API-val
    const fileBuffer = await file.arrayBuffer();
    const fileContent = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => {
        return data + String.fromCharCode(byte);
      }, '')
    );
    
    const visionRequestType = isPdf ? 'DOCUMENT_TEXT_DETECTION' : 'TEXT_DETECTION';
    const visionRequest = {
      requests: [
        {
          image: {
            content: fileContent
          },
          features: [
            {
              type: visionRequestType
            }
          ]
        }
      ]
    };
    
    console.log("🔍 Google Vision API hívás kezdése...");
    const processingStart = Date.now();
    
    // Google Vision API hívás
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleVisionApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visionRequest)
      }
    );
    
    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      throw new Error(`Google Vision API hiba: ${errorText}`);
    }
    
    const visionData = await visionResponse.json();
    const processingTime = Date.now() - processingStart;
    console.log(`✅ Google Vision feldolgozás befejezve (${processingTime}ms).`);
    
    // Szöveg kinyerése a válaszból
    let extractedText = '';
    if (visionData.responses && visionData.responses.length > 0) {
      if (visionData.responses[0].fullTextAnnotation) {
        extractedText = visionData.responses[0].fullTextAnnotation.text || '';
      } else if (visionData.responses[0].textAnnotations && visionData.responses[0].textAnnotations.length > 0) {
        extractedText = visionData.responses[0].textAnnotations[0].description || '';
      }
    }
    
    console.log(`📄 Kinyert szöveg hossza: ${extractedText.length} karakter`);
    console.log(`📄 Szöveg első 500 karaktere: ${extractedText.substring(0, 500)}...`);
    
    // Metaadatok kinyerése
    const metadata = {
      filename: file.name,
      filesize: file.size,
      filetype: file.type,
      processingTime: processingTime,
      textLength: extractedText.length,
      extractionMethod: 'Google Vision API',
      timestamp: new Date().toISOString()
    };
    
    // OCR eredmény mentése az adatbázisba
    const ocrLogId = await saveOcrResult(
      supabase, 
      userId, 
      file.name, 
      file.size, 
      file.type, 
      extractedText, 
      metadata
    );
    
    return new Response(
      JSON.stringify({
        ocrLogId,
        ocrText: extractedText,
        processingTime,
        metadata
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
    
  } catch (error) {
    console.error("🔥 Feldolgozási hiba:", error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || "Ismeretlen hiba történt", 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

// OCR eredmény mentése az adatbázisba
async function saveOcrResult(
  supabase: SupabaseClient,
  userId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  ocrContent: string,
  metadata: any = {}
): Promise<string | null> {
  try {
    console.log(`📝 OCR eredmények mentése az adatbázisba: ${fileName}`);
    
    // Mentjük az OCR eredményt
    const { data, error } = await supabase.from('document_ocr_logs')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        ocr_content: ocrContent,
        processing_metadata: metadata
      })
      .select('id')
      .single();
    
    if (error) {
      console.error(`❌ Hiba az OCR eredmények mentésekor: ${error.message}`, error);
      return null;
    }
    
    console.log(`✅ OCR eredmények sikeresen mentve. Log ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error(`❌ Váratlan hiba az OCR eredmények mentése során:`, error);
    return null;
  }
}
