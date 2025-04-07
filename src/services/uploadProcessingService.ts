
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
  let storagePath = null;
  try {
    storagePath = await uploadFileToStorage(file, user.id);
    
    if (storagePath) {
      updateStatus({
        step: "Dokumentum mentve a tárhelyre",
        progress: 20,
        details: `Fájl sikeresen mentve: ${storagePath}`
      });
    }
  } catch (storageError) {
    console.warn("Fájl feltöltési jogosultsági hiba. Ellenőrizze a Supabase RLS beállításait a storage.objects táblára!");
    // Folytatjuk a feldolgozást még ha a tárolás nem is sikerült
  }
  
  if (!storagePath) {
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
    
    // Háromszori próbálkozás lehetősége
    const maxRetries = 2;
    let retryCount = 0;
    let lastError = null;
    
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          updateStatus({
            step: "Claude AI kapcsolódás újrapróbálása",
            progress: 50,
            details: `Újrapróbálkozás (${retryCount}/${maxRetries})...`
          });
          
          // Várunk egy kicsit az újrapróbálkozás előtt
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
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
        lastError = fetchError;
        
        if (fetchError.name === 'AbortError') {
          clearTimeout(timeoutId);
          throw new Error('A dokumentum feldolgozása túl sokáig tartott és megszakításra került (időtúllépés)');
        }
        
        // Részletes hálózati hibák
        if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
          console.error("Hálózati hiba:", fetchError);
          
          // Csak akkor próbálkozunk újra, ha hálózati hiba történt
          if (retryCount < maxRetries) {
            retryCount++;
            continue;
          }
          
          throw new Error('Hálózati kapcsolati hiba a Claude AI kiszolgálóval. Ellenőrizze internetkapcsolatát vagy próbálja újra később.');
        }
        
        throw fetchError;
      }
    }
    
    // Ha idáig eljutunk, akkor minden próbálkozás sikertelen volt
    throw lastError || new Error('Sikertelen kapcsolódás a Claude AI kiszolgálóhoz több próbálkozás után is.');
    
  } catch (error) {
    console.error("AI feldolgozási hiba:", error);
    
    updateStatus({
      step: "Hiba a feldolgozás során",
      progress: 70,
      details: "Hiba történt: " + (error instanceof Error ? error.message : "Ismeretlen hiba")
    });
    
    // Check if the Claude Edge Function is deployed
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const healthCheck = await fetch(
          'https://ynfciltkzptrsmrjylkd.supabase.co/functions/v1/process-with-claude',
          {
            method: 'OPTIONS',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            }
          }
        );
        
        if (!healthCheck.ok) {
          console.error("Claude AI Edge Function nem érhető el:", healthCheck.status);
          return Promise.reject(new Error("A Claude AI szolgáltatás jelenleg nem elérhető. Kérjük próbálja később!"));
        }
      }
    } catch (healthCheckError) {
      console.error("Hiba a Claude funkció elérhetőségének ellenőrzésekor:", healthCheckError);
    }
    
    // Hibaüzenet részletezése a felhasználó számára
    const errorMessage = error instanceof Error ? error.message : "Ismeretlen hiba a dokumentum feldolgozása során";
    throw new Error(`A dokumentum feldolgozása sikertelen: ${errorMessage}`);
  }
};
