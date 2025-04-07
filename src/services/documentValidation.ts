
/**
 * Document validation utilities
 */

/**
 * Validates a file to ensure it's of an acceptable type
 */
export const validateDocumentFile = (file: File): { valid: boolean; error?: string } => {
  if (!file) {
    return { valid: false, error: "Nincs kiválasztva fájl" };
  }
  
  const acceptableTypes = [
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (!acceptableTypes.includes(file.type)) {
    return { 
      valid: false, 
      error: "Kérjük, PDF vagy Excel formátumú dokumentumot töltsön fel" 
    };
  }
  
  return { valid: true };
};
