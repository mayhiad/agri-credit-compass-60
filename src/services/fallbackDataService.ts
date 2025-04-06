
import { FarmData } from "@/components/LoanApplication";

/**
 * Generates fallback farm data when AI processing fails
 */
export const generateFallbackFarmData = (
  userId: string, 
  fileName?: string, 
  fileSize?: number
): FarmData => {
  // Jelenlegi év meghatározása
  const currentYear = new Date().getFullYear().toString();
  
  // Minta adatok használata 
  return {
    hectares: 451.8,
    cultures: [
      { name: "Búza", hectares: 200.75, estimatedRevenue: 85000000 },
      { name: "Kukorica", hectares: 150.75, estimatedRevenue: 84420000 },
      { name: "Napraforgó", hectares: 100.30, estimatedRevenue: 49647000 }
    ],
    totalRevenue: 219067000,
    region: "Dél-Alföld",
    documentId: `SAPS-${currentYear}-${Math.floor(Math.random() * 900000) + 100000}`,
    applicantName: userId.split('@')[0] || "Felhasználó",
    blockIds: ["KDPJ-34", "LHNM-78", "PTVS-92"],
    year: currentYear,
    fileName,
    fileSize
  };
};

/**
 * Validates and fixes farm data to ensure all required fields are present
 */
export const validateAndFixFarmData = (farmData: FarmData): FarmData => {
  const result = { ...farmData };
  
  // Validate and fix basic required fields
  if (typeof result.hectares !== 'number' || isNaN(result.hectares)) {
    result.hectares = 0;
  }
  
  if (typeof result.totalRevenue !== 'number' || isNaN(result.totalRevenue)) {
    result.totalRevenue = 0;
  }
  
  if (!result.region) {
    result.region = "Ismeretlen régió";
  }
  
  if (!result.cultures || !Array.isArray(result.cultures)) {
    result.cultures = [];
  }
  
  return result;
};
