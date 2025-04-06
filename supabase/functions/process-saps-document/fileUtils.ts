
import { openai, supabase, getErrorDetails } from "./openaiClient.ts";

// Fájl feltöltése OpenAI-ba
export async function uploadFileToOpenAI(fileBuffer: ArrayBuffer, fileName: string) {
  console.log(`📤 Fájl feltöltése az OpenAI-ba kezdése: ${fileName}, méret: ${fileBuffer.byteLength} bájt`);
  const fileUploadStart = Date.now();
  
  try {
    const file = await openai.files.create({
      file: new File([fileBuffer], fileName, { type: 'application/pdf' }),
      purpose: "assistants"
    });
    
    const fileUploadTime = Date.now() - fileUploadStart;
    console.log(`✅ Fájl sikeresen feltöltve (${fileUploadTime}ms). File ID: ${file.id}, Név: ${file.filename}, Méret: ${file.bytes} bájt, Célja: ${file.purpose}`);
    
    // Ellenőrizzük a fájl ID formátumát
    if (!file.id.startsWith('file-')) {
      console.warn(`⚠️ Váratlan fájl ID formátum: ${file.id}. Az OpenAI általában "file-" előtaggal kezdődő ID-kat használ.`);
    } else {
      console.log(`✓ Helyes fájl ID formátum: ${file.id}`);
    }
    
    return file;
  } catch (error) {
    console.error("❌ Hiba a fájl feltöltése során:", JSON.stringify({
      status: error.status,
      message: error.message,
      type: error.type,
      code: error.code
    }, null, 2));
    throw error;
  }
}

// Dokumentum mentése a Supabase tárolóba
export async function saveDocumentToStorage(fileBuffer: ArrayBuffer, fileName: string, userId: string) {
  try {
    console.log(`💾 Dokumentum mentése a Supabase tárolóba: ${fileName} felhasználó: ${userId}`);
    const saveStart = Date.now();
    
    // Validáljuk a Supabase kliens állapotát
    if (!supabase || !supabase.storage) {
      console.error("❌ Supabase kliens nem elérhető vagy nincs inicializálva");
      return; // Folytatjuk a feldolgozást annak ellenére, hogy nem sikerült tárolni
    }
    
    // Generálunk egy egyedi fájl nevet
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = fileName.split('.').pop();
    
    // Tisztítjuk a fájlnevet a speciális karakterektől
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `saps/${userId}/${timestamp}-${cleanFileName}`;
    
    console.log(`📁 Tárolási útvonal: ${storagePath}`);
    
    const { data, error } = await supabase.storage
      .from('dokumentumok')
      .upload(storagePath, fileBuffer, {
        contentType: fileExtension === 'pdf' ? 'application/pdf' : 
                    (fileExtension === 'xlsx' || fileExtension === 'xls') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                    'application/octet-stream',
        upsert: false
      });
    
    if (error) {
      console.error("❌ Hiba a dokumentum tárolása során:", error.message, error.details);
      console.error("❌ Teljes hiba: ", JSON.stringify(error, null, 2));
      // Folytatjuk a feldolgozást annak ellenére, hogy nem sikerült tárolni
    } else {
      const saveTime = Date.now() - saveStart;
      console.log(`✅ Dokumentum sikeresen tárolva (${saveTime}ms). Path: ${storagePath}`);
    }
    
    return storagePath;
  } catch (storageError) {
    console.error("❌ Váratlan hiba a dokumentum tárolása során:", getErrorDetails(storageError));
    console.error("❌ Teljes hiba: ", JSON.stringify(storageError, null, 2));
    // Folytatjuk a feldolgozást annak ellenére, hogy nem sikerült tárolni
    return null;
  }
}
