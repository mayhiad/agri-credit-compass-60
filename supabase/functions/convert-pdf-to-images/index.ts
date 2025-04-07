import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../process-saps-document/cors.ts";
import { supabase } from "../process-saps-document/openaiClient.ts";

// Maximum allowed document pages
const MAX_ALLOWED_PAGES = 99;

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the ConvertAPI key from environment variables
    const convertApiKey = Deno.env.get('CONVERT_API_KEY');
    
    if (!convertApiKey) {
      throw new Error("CONVERT_API_KEY környezeti változó nincs beállítva");
    }

    // Get file from request
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    
    if (!file) {
      throw new Error("Nincs fájl a kérésben");
    }
    
    if (!userId) {
      throw new Error("Hiányzó felhasználói azonosító");
    }

    console.log(`📄 Fájl fogadva: ${file.name}, méret: ${file.size}, felhasználó: ${userId}`);
    
    // Generate a unique batch ID for this conversion job
    const batchId = crypto.randomUUID();
    
    // Upload the original PDF to storage for record keeping
    const fileBuffer = await file.arrayBuffer();
    const pdfStoragePath = `saps/${userId}/${batchId}/${file.name}`;
    
    await supabase.storage
      .from('dokumentumok')
      .upload(pdfStoragePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      });
    
    // Get page count using ConvertAPI
    console.log("⏳ PDF oldalszám ellenőrzése ConvertAPI segítségével...");
    
    // First, use the info endpoint to get metadata and page count
    const infoResponse = await fetch(`https://v2.convertapi.com/info?Secret=${convertApiKey}`, {
      method: 'POST',
      body: fileBuffer,
      headers: {
        'Content-Type': 'application/pdf'
      }
    });
    
    if (!infoResponse.ok) {
      throw new Error(`ConvertAPI info error: ${infoResponse.status} - ${await infoResponse.text()}`);
    }
    
    const infoData = await infoResponse.json();
    const pageCount = infoData.PageCount || 0;
    
    console.log(`📊 PDF oldalszám: ${pageCount}`);
    
    // Check if document exceeds maximum page limit
    if (pageCount > MAX_ALLOWED_PAGES) {
      return new Response(JSON.stringify({
        error: `A feltöltött dokumentum túl nagy (${pageCount} oldal). A maximális megengedett oldalszám: ${MAX_ALLOWED_PAGES}.`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // If no pages, return error
    if (pageCount === 0) {
      return new Response(JSON.stringify({
        error: "A feltöltött PDF dokumentum üres vagy nem olvasható."
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Convert PDF to JPG images using ConvertAPI
    console.log("⏳ PDF konvertálása képekké ConvertAPI segítségével...");
    
    // Prepare FormData for the conversion request
    const convertFormData = new FormData();
    convertFormData.append('File', new Blob([fileBuffer], { type: 'application/pdf' }));
    convertFormData.append('StoreFile', 'true');
    
    const convertResponse = await fetch(`https://v2.convertapi.com/convert/pdf/to/jpg?Secret=${convertApiKey}&ImageResolutionH=1200&ImageResolutionV=1200&ScaleImage=true&ScaleProportions=true`, {
      method: 'POST',
      body: convertFormData
    });
    
    if (!convertResponse.ok) {
      throw new Error(`ConvertAPI conversion error: ${convertResponse.status} - ${await convertResponse.text()}`);
    }
    
    const convertData = await convertResponse.json();
    console.log("✅ PDF konvertálás kész, letöltési linkek:", convertData.Files.length);
    
    // Download each JPG and store it in Supabase storage
    const storedImages = [];
    
    for (let i = 0; i < convertData.Files.length; i++) {
      const fileUrl = convertData.Files[i].Url;
      const fileName = convertData.Files[i].FileName;
      const pageNumber = i + 1;
      
      console.log(`⏳ ${pageNumber}/${convertData.Files.length}. oldal letöltése: ${fileName}`);
      
      // Download the image from ConvertAPI
      const imageResponse = await fetch(fileUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Upload to Supabase storage
      const jpgStoragePath = `saps/${userId}/${batchId}/images/${pageNumber.toString().padStart(3, '0')}_${fileName}`;
      const { data, error } = await supabase.storage
        .from('dokumentumok')
        .upload(jpgStoragePath, imageBuffer, {
          contentType: 'image/jpeg',
          upsert: false
        });
      
      if (error) {
        console.error(`❌ Hiba a ${pageNumber}. kép feltöltésekor:`, error);
      } else {
        // Get public URL for the image
        const publicUrl = supabase.storage
          .from('dokumentumok')
          .getPublicUrl(jpgStoragePath).data.publicUrl;
        
        storedImages.push({
          pageNumber,
          storagePath: jpgStoragePath,
          url: publicUrl
        });
        
        console.log(`✅ ${pageNumber}. oldal sikeresen tárolva`);
      }
    }
    
    // Save batch information to database for later reference
    const { data: batchData, error: batchError } = await supabase
      .from('document_batches')
      .insert({
        batch_id: batchId,
        user_id: userId,
        document_name: file.name,
        page_count: pageCount,
        original_storage_path: pdfStoragePath,
        status: 'converted',
        metadata: {
          fileSize: file.size,
          timestamp: new Date().toISOString(),
          imageCount: storedImages.length
        }
      })
      .select('id')
      .single();
    
    if (batchError) {
      console.error("❌ Hiba a batch információk mentésekor:", batchError);
    }
    
    // Return batch information and stored images
    return new Response(JSON.stringify({
      batchId,
      pageCount,
      storedImages,
      batchDbId: batchData?.id || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Hiba a PDF konvertálása során:", error);
    
    return new Response(JSON.stringify({
      error: error.message || "Ismeretlen hiba történt a PDF konvertálása során"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
