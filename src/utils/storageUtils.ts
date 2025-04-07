
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
