
// Image processing utilities
import { isImageFormatSupported } from "./utils.ts";

/**
 * Validates and filters image URLs
 */
export function processImages(imageUrls: string[]) {
  // Initialize arrays for valid, invalid, and unsupported images
  const validImageUrls: string[] = [];
  const invalidImageUrls: string[] = [];
  const unsupportedFormatUrls: string[] = [];
  
  // Check each image URL
  for (const imageUrl of imageUrls) {
    try {
      // Validate image URL format
      const url = new URL(imageUrl);
      
      // Check for image format
      const path = url.pathname.toLowerCase();
      if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
        validImageUrls.push(imageUrl);
      } else {
        unsupportedFormatUrls.push(imageUrl);
      }
    } catch (error) {
      // URL is invalid
      invalidImageUrls.push(imageUrl);
    }
  }
  
  return { validImageUrls, invalidImageUrls, unsupportedFormatUrls };
}

/**
 * Filters supported and valid image URLs
 */
export function filterValidImages(imageUrls: string[]): string[] {
  const { validImageUrls } = processImages(imageUrls);
  return validImageUrls;
}
