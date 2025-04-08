
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
      if (isImageFormatSupported(path)) {
        validImageUrls.push(imageUrl);
      } else {
        unsupportedFormatUrls.push(imageUrl);
        console.log(`Unsupported image format: ${path}`);
      }
    } catch (error) {
      // URL is invalid
      invalidImageUrls.push(imageUrl);
      console.log(`Invalid image URL: ${imageUrl}`);
    }
  }
  
  console.log(`Images processed: Valid: ${validImageUrls.length}, Invalid: ${invalidImageUrls.length}, Unsupported: ${unsupportedFormatUrls.length}`);
  
  return { validImageUrls, invalidImageUrls, unsupportedFormatUrls };
}

/**
 * Filters supported and valid image URLs
 */
export function filterValidImages(imageUrls: string[]): string[] {
  const { validImageUrls } = processImages(imageUrls);
  return validImageUrls;
}
