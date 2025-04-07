
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";
import { supabase } from "./openaiClient.ts";
import { processAllImageBatches } from "./claudeProcessor.ts";

serve(async (req) => {
  // Add initial log message
  console.log("📥 Supabase function meg lett hívva!");

  // CORS kezelése
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log("📥 Kérés érkezett: URL:", req.url, "Metódus:", req.method);
    console.log("📤 Kérés fejlécek:", JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    
    const requestData = await req.json();
    const { batchId, userId } = requestData;
    
    if (!batchId) throw new Error('Hiányzik a batch azonosító');
    if (!userId) throw new Error('Hiányzik a felhasználó azonosító');

    console.log(`🔍 SAPS dokumentum feldolgozása: Batch ID: ${batchId}, Felhasználó: ${userId}`);
    
    // Ellenőrizzük, hogy létezik-e a batch
    const { data: batchData, error: batchError } = await supabase
      .from('document_batches')
      .select('*')
      .eq('batch_id', batchId)
      .eq('user_id', userId)
      .single();
      
    if (batchError || !batchData) {
      throw new Error(`Nem található a megadott batch: ${batchError?.message || 'Ismeretlen hiba'}`);
    }
    
    console.log(`📊 Batch információk: ${batchData.page_count} oldal, státusz: ${batchData.status}`);
    
    // Ha a batch már feldolgozva volt, visszaadjuk a meglévő eredményt
    if (batchData.status === 'completed' && batchData.metadata?.extractedData) {
      console.log(`🔄 A batch már fel lett dolgozva, visszaadjuk a meglévő eredményt`);
      
      return new Response(JSON.stringify({
        data: {
          applicantName: batchData.metadata.extractedData.submitterName || null,
          documentId: batchData.metadata.extractedData.submitterId || null,
          submitterId: batchData.metadata.extractedData.submitterId || null,
          applicantId: batchData.metadata.extractedData.applicantId || null,
          region: null,
          year: new Date().getFullYear().toString(),
          hectares: 0,
          cultures: [],
          blockIds: [],
          totalRevenue: 0
        },
        status: 'completed',
        batchInfo: {
          totalBatches: Math.ceil(batchData.page_count / 20),
          processedBatches: Math.ceil(batchData.page_count / 20),
          totalPages: batchData.page_count,
          processedPages: batchData.page_count
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Lekérjük a batchhez tartozó képeket a tárolóból
    console.log(`🖼️ Képek lekérése a batch-hez: ${batchId}`);
    
    const { data: files, error: filesError } = await supabase.storage
      .from('dokumentumok')
      .list(`saps/${userId}/${batchId}/images`);
      
    if (filesError || !files) {
      throw new Error(`Nem sikerült lekérni a képeket: ${filesError?.message || 'Ismeretlen hiba'}`);
    }
    
    console.log(`📁 ${files.length} kép található a tárolóban`);
    
    // Rendezzük a fájlokat oldalszám szerint
    const sortedFiles = files.sort((a, b) => {
      const aNum = parseInt(a.name.split('_')[0]) || 0;
      const bNum = parseInt(b.name.split('_')[0]) || 0;
      return aNum - bNum;
    });
    
    // Generáljuk a képek nyilvános URL-jeit
    const imageUrls = sortedFiles.map(file => {
      return supabase.storage
        .from('dokumentumok')
        .getPublicUrl(`saps/${userId}/${batchId}/images/${file.name}`).data.publicUrl;
    });
    
    console.log(`🌐 ${imageUrls.length} kép URL generálva`);
    
    // Feldolgozzuk az összes képet a Claude AI-val
    const result = await processAllImageBatches(imageUrls, userId, batchId);
    
    // OCR eredmény mentése az adatbázisba
    const { data: ocrLog, error: ocrError } = await supabase
      .from('document_ocr_logs')
      .insert({
        user_id: userId,
        file_name: batchData.document_name,
        file_size: batchData.metadata?.fileSize || 0,
        file_type: 'application/pdf',
        storage_path: batchData.original_storage_path,
        ocr_content: result.rawText || "No OCR text available"
      })
      .select('id')
      .single();
      
    if (ocrError) {
      console.warn(`⚠️ OCR napló mentési hiba: ${ocrError.message}`);
    } else {
      console.log(`✅ OCR napló sikeresen létrehozva: ${ocrLog.id}`);
    }
    
    // AI feldolgozás eredményének mentése
    if (ocrLog?.id) {
      const { error: extractionError } = await supabase
        .from('document_extraction_results')
        .insert({
          ocr_log_id: ocrLog.id,
          user_id: userId,
          extracted_data: result.data || { status: 'processing' },
          processing_status: result.data ? 'completed' : 'in_progress',
          processing_time: 0
        });
        
      if (extractionError) {
        console.warn(`⚠️ Extrakciós eredmény mentési hiba: ${extractionError.message}`);
      }
    }
    
    // Eredmény visszaadása
    return new Response(JSON.stringify({
      ocrLogId: ocrLog?.id || null,
      data: result.data,
      status: 'completed',
      batchInfo: result.batchInfo
    }), {
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
