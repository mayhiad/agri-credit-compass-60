
import { FarmData } from "@/components/LoanApplication";
import { supabase } from "@/integrations/supabase/client";
import { uploadFileToStorage } from "@/utils/storageUtils";
import { extractFarmDataFromOcrText } from "@/services/sapsProcessor";

export type ProcessingStatus = {
  step: string;
  progress: number;
  details?: string;
  wordDocumentUrl?: string;
};

/**
 * Process a SAPS document file
 */
export const processSapsDocument = async (
  file: File, 
  user: any, 
  updateStatus: (status: ProcessingStatus) => void
): Promise<FarmData> => {
  if (!file) {
    throw new Error("Nincs kiválasztva fájl");
  }
  
  if (!user) {
    throw new Error("A dokumentum feldolgozásához be kell jelentkeznie");
  }
  
  updateStatus({
    step: "Dokumentum ellenőrzése",
    progress: 10,
  });
  
  // Először feltöltjük a dokumentumot a Storage-ba
  const storagePath = await uploadFileToStorage(file, user.id);
  
  if (storagePath) {
    updateStatus({
      step: "Dokumentum mentve a tárhelyre",
      progress: 20,
      details: `Fájl sikeresen mentve: ${storagePath}`
    });
  } else {
    console.warn("A fájl mentése a tárhelyre sikertelen volt, de a feldolgozás folytatódik");
  }
  
  updateStatus({
    step: "Dokumentum feltöltése feldolgozásra",
    progress: 30,
  });
  
  return await processWithClaudeAI(file, user, updateStatus);
};

/**
 * Claude AI használata a dokumentum feldolgozásához
 */
const processWithClaudeAI = async (
  file: File,
  user: any,
  updateStatus: (status: ProcessingStatus) => void
): Promise<FarmData> => {
  // Dokumentum feldolgozása Claude AI-val
  try {
    updateStatus({
      step: "Claude AI feldolgozás előkészítése",
      progress: 40,
      details: "Dokumentum előkészítése a Claude AI elemzésre..."
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("Nincs érvényes felhasználói munkamenet");
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    updateStatus({
      step: "Claude AI feldolgozás",
      progress: 50,
      details: "A dokumentum Claude AI elemzése folyamatban..."
    });
    
    console.log("Calling Claude AI edge function...");
    
    // Explicit timeout control
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 perc
    
    try {
      const claudeResponse = await fetch(
        'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-with-claude',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      console.log("Claude AI response status:", claudeResponse.status);
      
      if (!claudeResponse.ok) {
        const errorText = await claudeResponse.text();
        console.error("Claude feldolgozási hiba:", errorText);
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          errorData = { error: errorText || "Ismeretlen hiba történt" };
        }
        
        throw new Error(errorData.error || "Hiba a dokumentum feldolgozása közben");
      }
      
      updateStatus({
        step: "Claude AI feldolgozás sikeres",
        progress: 80,
        details: "A dokumentum elemzése befejeződött, adatok kinyerése..."
      });
      
      const claudeData = await claudeResponse.json();
      console.log("Claude AI response data:", claudeData);
      
      if (!claudeData.success || !claudeData.data) {
        throw new Error("Sikertelen adatkinyerés a dokumentumból: " + 
          (claudeData.error || "A Claude AI nem talált feldolgozható adatokat a dokumentumban"));
      }
      
      // Alapadatok kinyerése
      let farmData: FarmData = {
        ...claudeData.data,
        fileName: file.name,
        fileSize: file.size,
        hectares: 0,
        cultures: [],
        totalRevenue: 0
      };
      
      updateStatus({
        step: "Adatok feldolgozása befejezve",
        progress: 90,
        details: "Alapadatok feldolgozva: " + (farmData.applicantName ? `${farmData.applicantName}` : "Ismeretlen gazda")
      });
      
      return farmData;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('A dokumentum feldolgozása túl sokáig tartott és megszakításra került (időtúllépés)');
      }
      
      // Részletes hálózati hibák
      if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
        console.error("Hálózati hiba:", fetchError);
        throw new Error('Hálózati kapcsolati hiba a Claude AI kiszolgálóval. Ellenőrizze internetkapcsolatát vagy próbálja újra később.');
      }
      
      throw fetchError;
    }
    
  } catch (error) {
    console.error("AI feldolgozási hiba:", error);
    
    updateStatus({
      step: "Hiba a feldolgozás során",
      progress: 70,
      details: "Hiba történt: " + (error instanceof Error ? error.message : "Ismeretlen hiba")
    });
    
    // Hibaüzenet részletezése a felhasználó számára
    const errorMessage = error instanceof Error ? error.message : "Ismeretlen hiba a dokumentum feldolgozása során";
    throw new Error(`A dokumentum feldolgozása sikertelen: ${errorMessage}`);
  }
};
