import { getErrorDetails } from "./openaiClient.ts";
import { supabaseAdmin } from "./utils.ts";
import { DOMParser } from 'https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts';

// API endpoint for Google Cloud Vision OCR
const GOOGLE_VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

// Google Cloud Vision API Key
const GOOGLE_CLOUD_VISION_API_KEY = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');

/**
 * Save a document to Supabase storage
 */
export async function saveDocumentToStorage(fileBuffer: ArrayBuffer, fileName: string, userId: string): Promise<string | null> {
  try {
    console.log(`💾 Fájl mentése a Supabase tárolóba: ${fileName}`);

    // Fájlnév tisztítása
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');

    // Mappa létrehozása a felhasználóhoz
    const filePath = `saps_documents/${userId}/${cleanFileName}`;

    // Fájl feltöltése a Supabase tárolóba
    const { data, error } = await supabaseAdmin
      .storage
      .from('saps_documents')
      .upload(filePath, fileBuffer, {
        contentType: fileName.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
        upsert: true
      });

    if (error) {
      console.error(`❌ Hiba a fájl mentésekor a Supabase tárolóba: ${error.message}`);
      return null;
    }

    console.log(`✅ Fájl sikeresen mentve a Supabase tárolóba: ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`❌ Hiba a fájl mentésekor a Supabase tárolóba: ${getErrorDetails(error)}`);
    return null;
  }
}

/**
 * Extract text from a PDF document using Google Cloud Vision API
 */
export async function extractTextFromDocument(fileBuffer: ArrayBuffer): Promise<string | null> {
  try {
    if (!GOOGLE_CLOUD_VISION_API_KEY) {
      throw new Error('A Google Cloud Vision API kulcs nincs beállítva.');
    }

    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));

    const requestBody = {
      requests: [
        {
          image: {
            content: base64File
          },
          features: [
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 1
            }
          ]
        }
      ]
    };

    const response = await fetch(`${GOOGLE_VISION_API_URL}?key=${GOOGLE_CLOUD_VISION_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!data.responses || data.responses.length === 0 || !data.responses[0].fullTextAnnotation) {
      console.warn('⚠️ Nem sikerült szöveget kinyerni a dokumentumból a Google Cloud Vision API segítségével.');
      return null;
    }

    const extractedText = data.responses[0].fullTextAnnotation.text;
    console.log(`✅ Szöveg sikeresen kinyerve a dokumentumból (${extractedText.length} karakter).`);
    return extractedText;
  } catch (error) {
    console.error(`❌ Hiba a szöveg kinyerésekor a Google Cloud Vision API segítségével: ${getErrorDetails(error)}`);
    return null;
  }
}

/**
 * Log OCR result to the database
 */
export async function logOcrResult(
  userId: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  storagePath: string | null,
  ocrContent: string | null
): Promise<string | null> {
  try {
    console.log(`📝 OCR eredmény naplózása az adatbázisba: ${fileName}`);

    const { data, error } = await supabaseAdmin
      .from('document_ocr_logs')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        storage_path: storagePath,
        ocr_content: ocrContent
      })
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Hiba az OCR eredmény naplózásakor az adatbázisba: ${error.message}`);
      return null;
    }

    const logId = data.id;
    console.log(`✅ OCR eredmény sikeresen naplózva az adatbázisba. Napló ID: ${logId}`);
    return logId;
  } catch (error) {
    console.error(`❌ Hiba az OCR eredmény naplózásakor az adatbázisba: ${getErrorDetails(error)}`);
    return null;
  }
}

/**
 * Log extraction result to the database
 */
export async function logExtractionResult(
  ocrLogId: string,
  userId: string,
  extractedData: any,
  processingStatus: string,
  processingTime: number,
  threadId?: string,
  runId?: string
): Promise<boolean> {
  try {
    console.log(`📝 Feldolgozási eredmény naplózása az adatbázisba. OCR napló ID: ${ocrLogId}`);

    const { error } = await supabaseAdmin
      .from('document_extraction_results')
      .insert({
        ocr_log_id: ocrLogId,
        user_id: userId,
        extracted_data: extractedData,
        processing_status: processingStatus,
        processing_time: processingTime,
        thread_id: threadId,
        run_id: runId
      });

    if (error) {
      console.error(`❌ Hiba a feldolgozási eredmény naplózásakor az adatbázisba: ${error.message}`);
      return false;
    }

    console.log(`✅ Feldolgozási eredmény sikeresen naplózva az adatbázisba.`);
    return true;
  } catch (error) {
    console.error(`❌ Hiba a feldolgozási eredmény naplózásakor az adatbázisba: ${getErrorDetails(error)}`);
    return false;
  }
}

/**
 * Save raw Claude AI response to storage for debugging
 */
export async function saveRawClaudeResponse(
  rawText: string, 
  fileName: string,
  userId: string,
  ocrLogId: string
): Promise<string | null> {
  try {
    console.log(`📝 Saving raw Claude response to storage for document: ${fileName}, ocrLogId: ${ocrLogId}`);
    
    // Create a formatted filename for the Claude response
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '');
    const responsePath = `claude_responses/${userId}/${cleanFileName}_${timestamp}.txt`;
    
    // Upload the raw text as a file
    const { data, error } = await supabaseAdmin
      .storage
      .from('saps_documents')
      .upload(responsePath, new Blob([rawText]), {
        contentType: 'text/plain',
        upsert: true
      });
    
    if (error) {
      console.error(`❌ Error saving Claude response: ${error.message}`);
      return null;
    }
    
    // Generate a public URL for the file
    const { data: urlData } = await supabaseAdmin
      .storage
      .from('saps_documents')
      .getPublicUrl(responsePath);
    
    const publicUrl = urlData.publicUrl;
    
    // Update the document_ocr_logs table with the Claude response URL
    const { error: updateError } = await supabaseAdmin
      .from('document_ocr_logs')
      .update({ claude_response_url: publicUrl })
      .eq('id', ocrLogId);
    
    if (updateError) {
      console.error(`❌ Error updating OCR log with Claude response URL: ${updateError.message}`);
    } else {
      console.log(`✅ Successfully saved Claude response at: ${publicUrl}`);
    }
    
    return publicUrl;
  } catch (error) {
    console.error(`❌ Error in saveRawClaudeResponse: ${getErrorDetails(error)}`);
    return null;
  }
}
