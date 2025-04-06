
import { supabase, getErrorDetails } from "./openaiClient.ts";

// Egyszerű PDF és Excel dokumentum szöveg kinyerése
export async function extractTextFromDocument(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
  console.log(`📄 Szöveg kinyerése kezdése: ${fileName}`);
  const extractStart = Date.now();
  
  try {
    // Alap szöveget próbálunk kinyerni a dokumentumból
    // PDF esetén csak egyszerűen byte formátumból konvertálunk karakterkódolással
    let extractedText = "";
    
    // Ellenőrizzük a fájl típusát a neve alapján
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'pdf') {
      console.log(`📑 PDF dokumentum feldolgozása...`);
      
      // Egyszerű PDF feldolgozás - ez csak nagyon alapszintű szöveget ad vissza
      // Valós megoldásban itt használnánk egy komplexebb PDF parser-t
      const decoder = new TextDecoder('utf-8');
      try {
        extractedText = decoder.decode(fileBuffer);
      } catch (decodeError) {
        console.error(`❌ Hiba a PDF dekódolása során: ${decodeError}`);
        // Próbáljuk meg latin1 kódolással is, ami gyakran működik az európai nyelvekhez
        try {
          extractedText = new TextDecoder('latin1').decode(fileBuffer);
        } catch (secondDecodeError) {
          console.error(`❌ A másodlagos dekódolás is sikertelen: ${secondDecodeError}`);
        }
      }
      
      // Tisztítsuk meg a szöveget a bináris karakterektől
      extractedText = extractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
      extractedText = extractedText.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]/g, ' ');
      
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      console.log(`📊 Excel dokumentum feldolgozása...`);
      
      // Excel esetén csak egy egyszerű üzenetet küldünk vissza, hogy kezelje a modellje
      extractedText = `Ez egy Excel formátumú SAPS dokumentum. Kérlek olvasd ki a gazdálkodó nevét belőle.
      Az Excel dokumentumokból nem tudunk automatikusan szöveget kinyerni, kérlek jelezd, ha ez problémát okoz.`;
      
    } else {
      console.log(`❓ Ismeretlen dokumentum típus: ${fileExtension}`);
      extractedText = `Ismeretlen dokumentum formátum: ${fileExtension}. 
      Kérlek próbáld meg PDF vagy Excel formátumban feltölteni a dokumentumot.`;
    }
    
    // Ellenőrizzük a kinyert szöveg méretét
    console.log(`📏 Kinyert szöveg hossza: ${extractedText.length} karakter`);
    
    if (extractedText.length < 100) {
      console.warn(`⚠️ A kinyert szöveg nagyon rövid (${extractedText.length} karakter), ez jelentheti, hogy nem sikerült megfelelően kinyerni a szöveget.`);
    }
    
    const extractTime = Date.now() - extractStart;
    console.log(`✅ Szöveg kinyerése befejezve (${extractTime}ms).`);
    
    return extractedText;
  } catch (error) {
    console.error(`❌ Hiba a szöveg kinyerése során: ${getErrorDetails(error)}`);
    
    // Hiba esetén egy alapértelmezett szöveget adunk vissza
    return `Nem sikerült kinyerni a szöveget a dokumentumból. Kérlek olvasd ki a gazdálkodó nevét.`;
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
