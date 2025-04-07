
import { FarmData } from "@/components/LoanApplication";

export interface ParcelData {
  id: string;
  blockId: string;
  area: number;
  location: string;
  cultures: string[];
}

/**
 * Extracts farm data from OCR text
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
  
  // Try to extract document ID (e.g., SAPS-2023-12345)
  const documentIdMatch = ocrText.match(/(?:SAPS|S\.A\.P\.S|MFP)[- _]?(\d{4})[- _]?(\w+)/i);
  if (documentIdMatch) {
    extractedData.documentId = documentIdMatch[0];
  }
  
  // Try to extract year
  const yearMatch = ocrText.match(/\b(202\d|201\d)\b/);
  if (yearMatch) {
    extractedData.year = yearMatch[1];
  }
  
  // Try to extract region/county name
  const countyPatterns = [
    'Bács-Kiskun', 'Baranya', 'Békés', 'Borsod-Abaúj-Zemplén', 'Csongrád-Csanád',
    'Fejér', 'Győr-Moson-Sopron', 'Hajdú-Bihar', 'Heves', 'Jász-Nagykun-Szolnok',
    'Komárom-Esztergom', 'Nógrád', 'Pest', 'Somogy', 'Szabolcs-Szatmár-Bereg',
    'Tolna', 'Vas', 'Veszprém', 'Zala'
  ];
  
  for (const county of countyPatterns) {
    if (ocrText.includes(county) || ocrText.includes(county.toLowerCase()) || ocrText.includes(county + ' megye')) {
      extractedData.region = county + ' megye';
      break;
    }
  }
  
  // Try to extract applicant name
  // Look for common Hungarian names or name patterns
  const nameMatch = ocrText.match(/(?:Kérelmező|Igénylő|Ügyfél|Gazdálkodó|Név)[\s:]+([\wáéíóöőúüűÁÉÍÓÖŐÚÜŰ\s-]{5,30})/i);
  if (nameMatch && nameMatch[1]) {
    extractedData.applicantName = nameMatch[1].trim();
  }
  
  // Try to extract total hectares
  const hectaresMatches = ocrText.match(/összesen:?\s*(\d+[,.]\d+|\d+)\s*(?:ha|hektár)/i) || 
                          ocrText.match(/terület\s*(?:nagysága|mérete)?:?\s*(\d+[,.]\d+|\d+)\s*(?:ha|hektár)/i);
  
  if (hectaresMatches && hectaresMatches[1]) {
    const hectaresStr = hectaresMatches[1].replace(',', '.');
    extractedData.hectares = parseFloat(hectaresStr);
  }
  
  // Try to extract block IDs
  const blockIdMatches = ocrText.match(/\b([A-Z][0-9]{4,6})\b/g) || 
                         ocrText.match(/blokkazonosító:?\s*([A-Z][0-9]{4,6})/gi);
  
  if (blockIdMatches && blockIdMatches.length > 0) {
    extractedData.blockIds = Array.from(new Set(blockIdMatches)); // Remove duplicates
  }
  
  // Log extraction results
  console.log("Extracted farm data from OCR:", extractedData);
  
  return extractedData;
};
