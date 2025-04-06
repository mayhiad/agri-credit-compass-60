
import { FarmData } from "@/components/LoanApplication";

/**
 * Generates fallback farm data when AI processing fails
 * ATTENTION: This is for demonstration purposes only and should only be used
 * when AI processing completely fails. In a real application, always
 * use data extracted from the document.
 */
export const generateFallbackFarmData = (
  userId: string, 
  fileName?: string, 
  fileSize?: number
): FarmData => {
  console.error("WARNING: Generating fallback data. This should only be an emergency case!");
  
  // Determine current year
  const currentYear = new Date().getFullYear().toString();
  
  // Create empty data structure - it MUST NOT contain random data!
  return {
    hectares: 0,
    cultures: [],
    totalRevenue: 0,
    region: "Data extraction failed",
    documentId: `SAPS-${currentYear}-ERR`,
    applicantName: "Processing failed",
    blockIds: [],
    year: currentYear,
    fileName,
    fileSize,
    // Use proper error handling with errorMessage property
    errorMessage: "Document processing failed. Please check the uploaded file and try again."
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
    // Calculate revenue based on cultures if available
    if (result.cultures && result.cultures.length > 0) {
      result.totalRevenue = result.cultures.reduce((sum, culture) => 
        sum + (typeof culture.estimatedRevenue === 'number' ? culture.estimatedRevenue : 0), 0);
    } else {
      result.totalRevenue = 0;
    }
  }
  
  if (!result.region) {
    result.region = "Unknown region";
  }
  
  if (!result.cultures || !Array.isArray(result.cultures)) {
    result.cultures = [];
  }
  
  // Check if each culture has the required fields
  result.cultures = result.cultures.map(culture => {
    const fixedCulture = { ...culture };
    
    if (typeof fixedCulture.hectares !== 'number' || isNaN(fixedCulture.hectares)) {
      fixedCulture.hectares = 0;
    }
    
    if (typeof fixedCulture.estimatedRevenue !== 'number' || isNaN(fixedCulture.estimatedRevenue)) {
      // Calculate revenue based on hectares, yield and price if available
      // Proper type casting és biztonságos elérés a yieldPerHectare és pricePerTon mezőkhöz
      const yieldValue = fixedCulture.yieldPerHectare;
      const priceValue = fixedCulture.pricePerTon;
      
      if (fixedCulture.hectares && yieldValue && priceValue) {
        fixedCulture.estimatedRevenue = fixedCulture.hectares * yieldValue * priceValue;
      } else {
        fixedCulture.estimatedRevenue = 0;
      }
    }
    
    return fixedCulture;
  });
  
  // Check total hectares
  const calculatedHectares = result.cultures.reduce((sum, culture) => sum + culture.hectares, 0);
  if (result.hectares === 0 && calculatedHectares > 0) {
    result.hectares = calculatedHectares;
  }
  
  return result;
};
