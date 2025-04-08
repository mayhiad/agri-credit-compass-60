
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
