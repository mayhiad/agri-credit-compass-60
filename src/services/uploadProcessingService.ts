
import { FarmData } from "@/types/farm";
import { supabase } from "@/integrations/supabase/client";
import { processDocumentWithOpenAI, checkProcessingResults } from "@/services/documentProcessingService";
import { uploadFileToStorage, convertPdfToImages, convertPdfFirstPageToImage } from "@/utils/storageUtils";
import { generateFallbackFarmData, validateAndFixFarmData } from "@/services/fallbackDataService";
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
  
  // PDF fájl esetén konvertáljuk képpé
  let pdfImages = null;
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  
  if (isPdf) {
    updateStatus({
      step: "PDF feldolgozása",
      progress: 25,
      details: "PDF oldalak képpé konvertálása..."
    });
    
    try {
      // Első oldal konvertálása a gyors eredményhez
      const firstPageImage = await convertPdfFirstPageToImage(file);
      
      if (firstPageImage) {
        updateStatus({
          step: "PDF konvertálva",
          progress: 30,
          details: "PDF első oldala sikeresen képpé konvertálva"
        });
        
        // Háttérben elindítjuk a többi oldal konvertálását
        const allPagesPromise = convertPdfToImages(file, 5);
        
        // A háttérfolyamatot nem várjuk meg, csak az első oldallal folytatunk
        allPagesPromise.then(images => {
          if (images && images.length > 1) {
            console.log(`✅ Összes PDF oldal konvertálva: ${images.length} oldal`);
          }
        }).catch(error => {
          console.error("Hiba az összes PDF oldal konvertálása során:", error);
        });
        
        pdfImages = [firstPageImage];
      } else {
        updateStatus({
          step: "PDF konvertálás sikertelen",
          progress: 30,
          details: "Nem sikerült a PDF-et képpé konvertálni, folytatás szöveges elemzéssel"
        });
      }
    } catch (error) {
      console.error("Hiba a PDF képpé konvertálása során:", error);
      updateStatus({
        step: "PDF konvertálás sikertelen",
        progress: 30,
        details: "Hiba történt a PDF képpé konvertálása során, folytatás szöveges elemzéssel"
      });
    }
  }
  
  updateStatus({
    step: "Dokumentum feltöltése",
    progress: 35,
  });
  
  // Form data létrehozása a fájllal
  const formData = new FormData();
  formData.append('file', file);
  
  // Ha van PDF kép, azt is elküldjük base64 formátumban
  if (pdfImages && pdfImages.length > 0 && pdfImages[0].base64) {
    formData.append('pdfImageBase64', pdfImages[0].base64);
    
    // Több oldal esetén tömbként is elküldjük
    if (pdfImages.length > 1) {
      const pdfImagesBase64 = pdfImages.map(img => img.base64);
      formData.append('pdfImagesBase64', JSON.stringify(pdfImagesBase64));
    }
  }
  
  // Claude feldolgozás
  return await processWithClaude(file, formData, user, updateStatus);
};

/**
 * Claude asszisztens használata a dokumentum feldolgozásához
 */
const processWithClaude = async (
  file: File,
  formData: FormData,
  user: any,
  updateStatus: (status: ProcessingStatus) => void
): Promise<FarmData> => {
  // Dokumentum feldolgozása Claude-dal
  let processResult;
  try {
    updateStatus({
      step: "Claude AI feldolgozás előkészítése",
      progress: 40,
      details: "A dokumentum Claude AI-val történő feldolgozása folyamatban..."
    });
    
    // Ellenőrizzük, hogy a fájl támogatott formátumú-e Claude-hoz
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const isImageFormat = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension || '');
    const isPdf = fileExtension === 'pdf' || file.type === 'application/pdf';
    
    if (!isImageFormat && !isPdf) {
      updateStatus({
        step: "Formátum konvertálása",
        progress: 45,
        details: "A formátum nem támogatott közvetlen képi feldolgozásként, szöveges feldolgozás..."
      });
    }
    
    processResult = await processDocumentWithOpenAI(file, user);
    
    if (!processResult) {
      throw new Error("Hiba történt a dokumentum feldolgozása során");
    }
  } catch (error) {
    console.error("Claude feldolgozási hiba:", error);
    throw new Error(`Az AI feldolgozás sikertelen volt: ${error.message || "Ismeretlen hiba"}`);
  }
  
  updateStatus({
    step: "Claude AI feldolgozás folyamatban",
    progress: 60,
    details: "A Claude feldolgozza a dokumentumot, ez néhány másodpercet igénybe vehet..."
  });
  
  // Ha közvetlen választ kaptunk Claude-tól:
  if (processResult.data) {
    updateStatus({
      step: "Dokumentum elemzése befejezve",
      progress: 80,
      details: "A Claude AI feldolgozta a dokumentumot"
    });
    
    let farmData: FarmData = processResult.data;
    
    // Ellenőrizzük, hogy a farm adatok hiányosak-e
    if (!farmData.applicantName || !farmData.submitterId || !farmData.applicantId) {
      console.warn("A Claude által feldolgozott adatok hiányosak:", farmData);
      
      updateStatus({
        step: "Alapértelmezett adatok generálása",
        progress: 85,
        details: "Az AI nem tudott elegendő adatot kinyerni, példa adatok generálása..."
      });
      
      // Fallback adatok generálása, de megtartjuk amit tudunk
      const fallbackData = generateFallbackFarmData(user.id, file.name, file.size);
      
      // Megtartjuk a Claude által kinyert adatokat, ha vannak
      farmData = {
        ...fallbackData,
        applicantName: farmData.applicantName || fallbackData.applicantName,
        documentId: farmData.documentId || fallbackData.documentId,
        submitterId: farmData.submitterId || fallbackData.submitterId,
        applicantId: farmData.applicantId || fallbackData.applicantId,
        errorMessage: "Nem sikerült az összes adatot kinyerni a dokumentumból. Demonstrációs adatok kerültek megjelenítésre.",
        ocrText: farmData.rawText || ""
      };
    }
    
    // Add file metadata
    farmData.fileName = file.name;
    farmData.fileSize = file.size;
    
    // További validáció és hiányzó mezők pótlása
    farmData = validateAndFixFarmData(farmData);
    
    updateStatus({
      step: "Adatok feldolgozása",
      progress: 90,
      details: `${farmData.submitterId || "Ismeretlen"} ügyfél-azonosító feldolgozva`
    });
    
    return farmData;
  }
  
  // Ha nincs közvetlen válasz, fallback adatok
  console.warn("AI feldolgozás sikertelen, fallback adatok generálása...");
  let farmData = generateFallbackFarmData(user.id, file.name, file.size);
  
  // Add file metadata
  farmData.fileName = file.name;
  farmData.fileSize = file.size;
  
  updateStatus({
    step: "Feldolgozás sikertelen",
    progress: 90,
    details: "Nem sikerült az adatokat kinyerni. Alapértelmezett adatok előállítása..."
  });
  
  // További validáció és hiányzó mezők pótlása
  farmData = validateAndFixFarmData(farmData);
  
  return farmData;
};
