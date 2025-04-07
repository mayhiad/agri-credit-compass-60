
import { FarmData } from "@/components/LoanApplication";

export interface ParcelData {
  id: string;
  blockId: string;
  area: number;
  location: string;
  cultures: string[];
}

/**
 * Egyszerű adatok kinyerése az OCR szövegből
 * @param ocrText - OCR szöveg, amiből az adatokat kinyerjük
 * @returns FarmData objektum a kinyert információkkal
 */
export const extractFarmDataFromOcrText = (ocrText: string): Partial<FarmData> => {
  if (!ocrText || ocrText.length === 0) {
    console.warn("Üres OCR szöveg érkezett az extractFarmDataFromOcrText függvénybe");
    return {};
  }

  console.log("Adatok kinyerése az OCR szövegből, hossza:", ocrText.length);
  
  const extractedData: Partial<FarmData> = {};
  
  // Próbáljuk kinyerni a gazdálkodó nevét
  const namePatterns = [
    /(?:Beadó|Kérelmező|Gazdálkodó|Ügyfél)\s*neve:?\s*([\wáéíóöőúüűÁÉÍÓÖŐÚÜŰ\s.-]{3,50})/i,
    /Név:?\s*([\wáéíóöőúüűÁÉÍÓÖŐÚÜŰ\s.-]{3,50})/i
  ];
  
  for (const pattern of namePatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      extractedData.applicantName = match[1].trim();
      break;
    }
  }
  
  // Próbáljuk kinyerni az azonosítószámot
  const idPatterns = [
    /(?:Beadó|Kérelmező|Gazdálkodó|Ügyfél)\s*azonosító(?:ja|:)?\s*:?\s*(\d{10})/i,
    /Azonosító(?:ja|:)?\s*:?\s*(\d{10})/i,
    /(?:Ügyfél-)?azonosító\s*szám:?\s*(\d{10})/i
  ];
  
  for (const pattern of idPatterns) {
    const match = ocrText.match(pattern);
    if (match && match[1]) {
      extractedData.documentId = match[1].trim();
      break;
    }
  }
  
  console.log("Kinyert adatok az OCR szövegből:", extractedData);
  
  return extractedData;
};
