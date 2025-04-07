
import { FarmData } from "@/components/LoanApplication";

export interface ParcelData {
  id: string;
  blockId: string;
  area: number;
  location: string;
  cultures: string[];
}

/**
 * Extracts basic farmer information from OCR text
 * @param ocrText - The OCR text to extract data from
 * @returns FarmData object with extracted information
 */
export const extractFarmDataFromOcrText = (ocrText: string): Partial<FarmData> => {
  if (!ocrText || ocrText.length === 0) {
    console.warn("Empty OCR text provided to extractFarmDataFromOcrText");
    return {};
  }

  console.log("Extracting farm data from OCR text, length:", ocrText.length);
  
  const extractedData: Partial<FarmData> = {};
  
  // Try to extract applicant name (Beadó/Kérelmező neve)
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
  
  // Try to extract document ID (10 digit code for the applicant)
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
  
  console.log("Extracted farm data from OCR:", extractedData);
  
  return extractedData;
};
