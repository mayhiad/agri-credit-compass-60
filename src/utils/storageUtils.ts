
import { supabase } from "@/integrations/supabase/client";

// Fájl feltöltése a Supabase tárolóba
export const uploadFileToStorage = async (fileToUpload: File, userId: string): Promise<string | null> => {
  try {
    if (!userId) {
      console.error("Nincs bejelentkezett felhasználó, nem lehet fájlt feltölteni");
      return null;
    }
    
    // Egyedi fájlnév generálása timestamppel
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = fileToUpload.name.split('.').pop();
    
    // Speciális karakterek eltávolítása a fájlnévből
    const cleanFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `saps/${userId}/${timestamp}-${cleanFileName}`;
    
    console.log("Fájl feltöltése a Storage-ba:", storagePath);
    
    const { data, error } = await supabase.storage
      .from('dokumentumok')
      .upload(storagePath, fileToUpload, {
        contentType: fileExtension === 'pdf' ? 'application/pdf' : 
                    (fileExtension === 'xlsx' || fileExtension === 'xls') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                    'application/octet-stream',
        upsert: false
      });
    
    if (error) {
      console.error("Hiba a dokumentum tárolása során:", error.message);
      return null;
    }
    
    console.log("Dokumentum sikeresen tárolva:", storagePath);
    return storagePath;
  } catch (err) {
    console.error("Váratlan hiba a tárolás során:", err);
    return null;
  }
};

// OCR szöveg mentése Word dokumentumként a Supabase tárolóba
export const saveOcrTextToWordDocument = async (
  ocrText: string, 
  fileName: string,
  userId: string,
  ocrLogId?: string
): Promise<string | null> => {
  try {
    console.log(`OCR szöveg mentése Word dokumentumként: ${fileName}`);
    
    // Egyszerű Word XML formátum létrehozása
    const wordXml = `
      <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
      <?mso-application progid="Word.Document"?>
      <w:wordDocument xmlns:w="http://schemas.microsoft.com/office/word/2003/wordml">
        <w:body>
          <w:p>
            <w:r>
              <w:t>OCR Eredmény - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:t>OCR Log ID: ${ocrLogId || 'Nincs'}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:t>Feldolgozva: ${new Date().toISOString()}</w:t>
            </w:r>
          </w:p>
          <w:p>
            <w:r>
              <w:t>${ocrText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '</w:t></w:r></w:p><w:p><w:r><w:t>')}</w:t>
            </w:r>
          </w:p>
        </w:body>
      </w:wordDocument>
    `;
    
    // Konvertáljuk a Word XML-t bináris formátumba
    const encoder = new TextEncoder();
    const wordData = encoder.encode(wordXml);
    
    // Mentjük a Supabase Storage-ba
    const storagePath = `ocrresults/${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('ocrresults')
      .upload(storagePath, wordData, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });
    
    if (error) {
      console.error("Hiba a Word dokumentum tárolása során:", error.message);
      return null;
    }
    
    // Publikus URL létrehozása a letöltéshez
    const { data: urlData } = await supabase.storage
      .from('ocrresults')
      .getPublicUrl(storagePath);
    
    const publicUrl = urlData?.publicUrl;
    console.log("Word dokumentum sikeresen tárolva:", publicUrl);
    
    // Frissítsük az OCR log rekordot a Word dokumentum URL-jével
    if (ocrLogId) {
      // Use processing_metadata field instead of document_url
      const { error: updateError } = await supabase
        .from('document_ocr_logs')
        .update({ 
          processing_metadata: {
            word_document_path: storagePath,
            word_document_url: publicUrl,
            created_at: new Date().toISOString()
          }
        })
        .eq('id', ocrLogId);
      
      if (updateError) {
        console.warn("Figyelem: Az OCR log frissítése sikertelen volt:", updateError);
      }
    }
    
    return publicUrl;
  } catch (err) {
    console.error("Váratlan hiba a Word dokumentum létrehozása során:", err);
    return null;
  }
};
