
import { FarmData } from "@/components/LoanApplication";

export const getBlocks = (data: any): string[] => {
  // Extract block IDs from data
  return data.blockIds || [];
};

export interface ParcelData {
  id: string;
  blockId: string;
  area: number;
  location: string;
  cultures: string[];
}

export const parseParcelsFromSapsData = (data: any): ParcelData[] => {
  // Extract parcels from SAPS data or generate sample data
  if (data && data.blockIds && Array.isArray(data.blockIds) && data.blockIds.length > 0) {
    return data.blockIds.map((blockId: string, index: number) => {
      // Choose some cultures for each parcel
      const allCultures = data.cultures || [];
      const parcelCultures = allCultures
        .slice(index % allCultures.length, (index % allCultures.length) + 2)
        .map((c: any) => c.name);
      
      return {
        id: `parcel-${index + 1}`,
        blockId,
        area: data.hectares / data.blockIds.length,
        location: `${data.region || 'Ismeretlen'} külterület`,
        cultures: parcelCultures.length > 0 ? parcelCultures : ['Ismeretlen növénykultúra']
      };
    });
  }
  
  return [];
};

// Add new function to try to extract farm data from OCR text
export const extractFarmDataFromOcrText = (ocrText: string): Partial<FarmData> => {
  if (!ocrText || typeof ocrText !== 'string' || ocrText.length < 10) {
    return {};
  }
  
  console.log(`Attempting to extract farm data from OCR text (${ocrText.length} characters)`);
  
  const extractedData: Partial<FarmData> = {};
  
  // Try to extract document ID (various formats like SAPS-XXX, etc.)
  const docIdMatch = ocrText.match(/(?:dokumentum|azonosító|kód|szám|SAPS)[\s:-]*([A-Z0-9][A-Z0-9\/-]+)/i);
  if (docIdMatch && docIdMatch[1]) {
    extractedData.documentId = docIdMatch[1].trim();
  }
  
  // Try to extract hectares 
  const hectaresMatch = ocrText.match(/(\d+[,.]\d+)\s*(?:ha|hektár)/i);
  if (hectaresMatch && hectaresMatch[1]) {
    const hectaresStr = hectaresMatch[1].replace(',', '.');
    extractedData.hectares = parseFloat(hectaresStr);
  }
  
  // Try to extract year/date
  const yearMatch = ocrText.match(/(20\d\d)[\/\.\s-]/);
  if (yearMatch && yearMatch[1]) {
    extractedData.year = yearMatch[1];
  }
  
  // Try to extract applicant name
  const nameMatch = ocrText.match(/(?:kérelmező|gazdálkodó|igénylő)[\s:]*([A-ZÁÉÍÓÖŐÚÜŰa-záéíóöőúüű\s\.]+)(?:\r|\n|,)/i);
  if (nameMatch && nameMatch[1]) {
    extractedData.applicantName = nameMatch[1].trim();
  }
  
  // Try to extract region
  const regionMatch = ocrText.match(/(?:régió|megye|település)[\s:]*([A-ZÁÉÍÓÖŐÚÜŰa-záéíóöőúüű\s\.]+)(?:\r|\n|,)/i);
  if (regionMatch && regionMatch[1]) {
    extractedData.region = regionMatch[1].trim();
  }
  
  // Try to extract blocks
  const blockMatches = Array.from(ocrText.matchAll(/(?:blokk|parcella)[\s:-]*([A-Z0-9-]+)/ig));
  if (blockMatches && blockMatches.length > 0) {
    extractedData.blockIds = blockMatches.map(match => match[1].trim());
  }
  
  console.log("Extracted data from OCR:", extractedData);
  return extractedData;
}
