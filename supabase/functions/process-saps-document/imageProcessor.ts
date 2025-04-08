
// Image processor for Claude AI
import { isImageFormatSupported } from "./utils.ts";

/**
 * Processes and validates a batch of image URLs for Claude AI
 */
export function processImages(images: string[]): {
  validImageUrls: string[];
  invalidImageUrls: string[];
  unsupportedFormatUrls: string[];
} {
  // Collect valid images
  const validImageUrls: string[] = [];
  const invalidImageUrls: string[] = [];
  const unsupportedFormatUrls: string[] = [];
  
  // Add all images to the message content
  for (let i = 0; i < images.length; i++) {
    try {
      const imageUrl = images[i];
      
      // Check if URL is properly formatted
      if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
        console.warn(`⚠️ Skipping invalid URL format at index ${i}: ${imageUrl}`);
        invalidImageUrls.push(imageUrl);
        continue;
      }
      
      // Check if URL is publicly accessible from Supabase
      if (!imageUrl.includes('supabase.co')) {
        console.warn(`⚠️ Image URL is not from Supabase, skipping: ${imageUrl}`);
        invalidImageUrls.push(imageUrl);
        continue;
      }
      
      // Check if image format is supported by Claude API
      if (!isImageFormatSupported(imageUrl)) {
        console.warn(`⚠️ Image format not supported by Claude API, skipping: ${imageUrl}`);
        unsupportedFormatUrls.push(imageUrl);
        continue;
      }
      
      // Log file extension for debugging
      const fileExtension = imageUrl.split('.').pop() || '';
      console.log(`📸 Image URL ${i + 1}: ${imageUrl.substring(0, 100)}... (format: ${fileExtension.toLowerCase()})`);
      
      validImageUrls.push(imageUrl);
    } catch (imageError) {
      console.error(`❌ Error processing image at index ${i}:`, imageError);
      invalidImageUrls.push(images[i]);
    }
  }
  
  // Log summary of image processing
  console.log(`🔍 Summary of image processing:`);
  console.log(`- Valid images: ${validImageUrls.length}`);
  console.log(`- Invalid URLs: ${invalidImageUrls.length}`);
  console.log(`- Unsupported formats: ${unsupportedFormatUrls.length}`);
  
  return {
    validImageUrls,
    invalidImageUrls,
    unsupportedFormatUrls
  };
}

/**
 * Filter a list of image URLs to only include valid ones for Claude processing
 */
export function filterValidImages(imageUrls: string[]): string[] {
  console.log(`🔄 Filtering image URLs: ${imageUrls.length} images`);
  
  // Filter out any obviously invalid URLs before batching
  const filteredUrls = imageUrls.filter(url => {
    const isValid = url && typeof url === 'string' && url.includes('supabase.co') && url.startsWith('http');
    if (!isValid) {
      console.warn(`⚠️ Filtering out invalid URL: ${url}`);
    }
    return isValid;
  });
  
  // Further filter for supported image formats
  const supportedUrls = filteredUrls.filter(url => {
    const isSupported = isImageFormatSupported(url);
    if (!isSupported) {
      console.warn(`⚠️ Filtering out unsupported image format: ${url}`);
    }
    return isSupported;
  });
  
  console.log(`✅ After filtering: ${supportedUrls.length} valid and supported images out of ${imageUrls.length} total`);
  
  // Log a few examples for verification
  if (supportedUrls.length > 0) {
    console.log(`📄 First few image URLs for verification:`);
    supportedUrls.slice(0, 3).forEach((url, i) => {
      console.log(`   ${i+1}: ${url}`);
    });
  }
  
  return supportedUrls;
}
