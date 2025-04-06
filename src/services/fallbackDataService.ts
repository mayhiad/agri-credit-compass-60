
import { FarmData } from "@/components/LoanApplication";

/**
 * Generates fallback farm data when AI processing fails
 * FIGYELEM: Ez csak demonstrációs célokra szolgál, és csak akkor használjuk,
 * ha az AI feldolgozás teljesen sikertelen. A valós alkalmazásban mindig
 * a dokumentumból kinyert adatokat kell használni.
 */
export const generateFallbackFarmData = (
  userId: string, 
  fileName?: string, 
  fileSize?: number
): FarmData => {
  console.error("FIGYELEM: Fallback adatok generálása történik. Ez csak vészhelyzeti eset lehet!");
  
  // Jelenlegi év meghatározása
  const currentYear = new Date().getFullYear().toString();
  
  // Üres adatstruktúra létrehozása - NEM tartalmazhat random adatokat!
  return {
    hectares: 0,
    cultures: [],
    totalRevenue: 0,
    region: "Adatok kinyerése sikertelen",
    documentId: `SAPS-${currentYear}-ERR`,
    applicantName: "Sikertelen feldolgozás",
    blockIds: [],
    year: currentYear,
    fileName,
    fileSize,
    error: "A dokumentum feldolgozása sikertelen volt. Kérjük, ellenőrizze a feltöltött fájlt és próbálja újra."
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
    // Számítsuk ki a bevételt a kultúrák alapján, ha azok rendelkezésre állnak
    if (result.cultures && result.cultures.length > 0) {
      result.totalRevenue = result.cultures.reduce((sum, culture) => 
        sum + (typeof culture.estimatedRevenue === 'number' ? culture.estimatedRevenue : 0), 0);
    } else {
      result.totalRevenue = 0;
    }
  }
  
  if (!result.region) {
    result.region = "Ismeretlen régió";
  }
  
  if (!result.cultures || !Array.isArray(result.cultures)) {
    result.cultures = [];
  }
  
  // Ellenőrizzük, hogy minden kultúra rendelkezik-e a szükséges mezőkkel
  result.cultures = result.cultures.map(culture => {
    const fixedCulture = { ...culture };
    
    if (typeof fixedCulture.hectares !== 'number' || isNaN(fixedCulture.hectares)) {
      fixedCulture.hectares = 0;
    }
    
    if (typeof fixedCulture.estimatedRevenue !== 'number' || isNaN(fixedCulture.estimatedRevenue)) {
      // Számítsuk ki a bevételt a hektár, hozam és ár alapján, ha rendelkezésre állnak
      if (fixedCulture.hectares && fixedCulture.yieldPerHectare && fixedCulture.pricePerTon) {
        fixedCulture.estimatedRevenue = fixedCulture.hectares * fixedCulture.yieldPerHectare * fixedCulture.pricePerTon;
      } else {
        fixedCulture.estimatedRevenue = 0;
      }
    }
    
    return fixedCulture;
  });
  
  // Ellenőrizzük a teljes hektárszámot
  const calculatedHectares = result.cultures.reduce((sum, culture) => sum + culture.hectares, 0);
  if (result.hectares === 0 && calculatedHectares > 0) {
    result.hectares = calculatedHectares;
  }
  
  return result;
};
