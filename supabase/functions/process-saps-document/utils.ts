
/**
 * Utility functions for the SAPS document processing
 */

/**
 * Split an array into batches of a specified size
 * @param array The array to split
 * @param batchSize The size of each batch
 * @returns An array of batches
 */
export const batchArray = <T>(array: T[], batchSize: number): T[][] => {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};

/**
 * Sort files by page number
 * @param files Array of files with names that include page numbers
 * @returns Sorted array of files
 */
export const sortFilesByPageNumber = (files: any[]): any[] => {
  return [...files].sort((a, b) => {
    // Extract page numbers from filenames (assumes format like "1_page.jpg", "2_page.jpg", etc.)
    const aMatch = a.name.match(/^(\d+)_/);
    const bMatch = b.name.match(/^(\d+)_/);
    
    const aNum = aMatch ? parseInt(aMatch[1]) : 0;
    const bNum = bMatch ? parseInt(bMatch[1]) : 0;
    
    return aNum - bNum;
  });
};

/**
 * Sort image URLs by page number
 * @param urls Array of image URLs with page numbers in the path
 * @returns Sorted array of image URLs
 */
export const sortImageUrlsByPageNumber = (urls: string[]): string[] => {
  return [...urls].sort((a, b) => {
    // Extract page numbers from URLs
    const aMatch = a.match(/\/(\d+)_/);
    const bMatch = b.match(/\/(\d+)_/);
    
    const aNum = aMatch ? parseInt(aMatch[1]) : 0;
    const bNum = bMatch ? parseInt(bMatch[1]) : 0;
    
    return aNum - bNum;
  });
};
