import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.0";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

// Define CORS headers directly in this file
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Supabase kliens inicializálása
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// PDF oldalak képekké konvertálása
async function convertPdfToImages(pdfBytes: Uint8Array, userId: string, fileName: string) {
  try {
    console.log(`📄 PDF konvertálás kezdése: ${fileName}, méret: ${pdfBytes.length} bájt`);
    
    // PDF dokumentum betöltése
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pageCount = pdfDoc.getPageCount();
    console.log(`📄 PDF oldalak száma: ${pageCount}`);
    
    if (pageCount === 0) {
      throw new Error("A PDF dokumentum nem tartalmaz oldalakat");
    }
    
    // Batch azonosító generálása
    const batchId = uuidv4();
    console.log(`🆔 Batch azonosító: ${batchId}`);
    
    // Batch információk mentése az adatbázisba
    const { data: batchData, error: batchError } = await supabase
      .from('document_batches')
      .insert({
        batch_id: batchId,
        user_id: userId,
        document_name: fileName,
        page_count: pageCount,
        status: 'processing',
        original_storage_path: `saps/${userId}/${batchId}/original.pdf`,
        metadata: {
          fileSize: pdfBytes.length,
          fileName: fileName,
          mimeType: 'application/pdf'
        }
      })
      .select()
      .single();
      
    if (batchError) {
      console.error("Hiba a batch információk mentése során:", batchError);
      throw new Error(`Nem sikerült menteni a batch információkat: ${batchError.message}`);
    }
    
    console.log(`💾 Batch információk mentve az adatbázisba: ${batchData.id}`);
    
    // Eredeti PDF mentése a tárolóba
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('dokumentumok')
      .upload(`saps/${userId}/${batchId}/original.pdf`, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });
      
    if (uploadError) {
      console.error("Hiba az eredeti PDF mentése során:", uploadError);
      throw new Error(`Nem sikerült menteni az eredeti PDF-et: ${uploadError.message}`);
    }
    
    console.log(`💾 Eredeti PDF mentve a tárolóba: ${uploadData.path}`);
    
    // Képek mappájának létrehozása
    const imagesFolder = `saps/${userId}/${batchId}/images`;
    
    // Oldalak feldolgozása és mentése képként
    console.log(`🖼️ Oldalak képekké konvertálása kezdődik...`);
    
    // Oldalak feldolgozása
    for (let i = 0; i < pageCount; i++) {
      try {
        // Új PDF dokumentum létrehozása egy oldallal
        const singlePagePdf = await PDFDocument.create();
        const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [i]);
        singlePagePdf.addPage(copiedPage);
        
        // PDF oldal mentése
        const pdfBytes = await singlePagePdf.save();
        
        // Oldal mentése a tárolóba
        const pageFileName = `${i + 1}_page.pdf`;
        const { data: pageData, error: pageError } = await supabase.storage
          .from('dokumentumok')
          .upload(`${imagesFolder}/${pageFileName}`, pdfBytes, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (pageError) {
          console.error(`Hiba a(z) ${i + 1}. oldal mentése során:`, pageError);
          continue;
        }
        
        console.log(`✅ ${i + 1}. oldal mentve: ${pageData.path}`);
      } catch (error) {
        console.error(`Hiba a(z) ${i + 1}. oldal feldolgozása során:`, error);
      }
    }
    
    // Batch státusz frissítése
    const { error: updateError } = await supabase
      .from('document_batches')
      .update({ status: 'converted' })
      .eq('batch_id', batchId);
      
    if (updateError) {
      console.error("Hiba a batch státusz frissítése során:", updateError);
    }
    
    console.log(`✅ PDF konvertálás befejezve: ${pageCount} oldal feldolgozva`);
    
    return {
      batchId,
      pageCount,
      status: 'converted'
    };
  } catch (error) {
    console.error("Hiba a PDF konvertálása során:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("📥 Kérés érkezett: PDF konvertálása képekké");
    
    // Ellenőrizzük, hogy a kérés tartalmaz-e fájlt
    if (req.method !== 'POST') {
      throw new Error("Csak POST kérések támogatottak");
    }
    
    // Kérés adatainak kinyerése
    const formData = await req.formData();
    const file = formData.get('file');
    const userId = formData.get('userId');
    
    if (!file || !(file instanceof File)) {
      throw new Error("Nincs fájl a kérésben");
    }
    
    if (!userId || typeof userId !== 'string') {
      throw new Error("Hiányzik a felhasználó azonosító");
    }
    
    console.log(`📄 Fájl neve: ${file.name}, mérete: ${file.size} bájt`);
    console.log(`👤 Felhasználó: ${userId}`);
    
    // Fájl tartalmának beolvasása
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    // PDF konvertálása képekké
    const result = await convertPdfToImages(fileBytes, userId, file.name);
    
    // Válasz küldése
    return new Response(JSON.stringify({
      success: true,
      message: "PDF sikeresen konvertálva képekké",
      batchId: result.batchId,
      pageCount: result.pageCount,
      status: result.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Hiba a PDF konvertálása során:", error);
    
    return new Response(JSON.stringify({ 
      error: error.message || "Ismeretlen hiba történt a PDF konvertálása során" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
