
// Claude API processor for document extraction
import { encode as base64Encode } from "https://deno.land/std@0.82.0/encoding/base64.ts";
import { supabase } from "./openaiClient.ts";

// Claude API constants
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-opus-20240229";
const MAX_IMAGES_PER_REQUEST = 20; // Claude API limit

// Supported image formats by Claude API
const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

/**
 * Checks if an image URL has a supported file format
 */
function isImageFormatSupported(imageUrl: string): boolean {
  // Check if URL ends with a supported format
  return SUPPORTED_IMAGE_FORMATS.some(format => 
    imageUrl.toLowerCase().endsWith(format)
  );
}

/**
 * Processes a batch of images with Claude API
 */
export async function processImageBatchWithClaude(
  images: string[], 
  userId: string,
  batchId: string,
  batchIndex: number,
  totalBatches: number
) {
  console.log(`🧠 Starting Claude AI processing for batch ${batchIndex}/${totalBatches}: ${images.length} images`);
  
  try {
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!claudeApiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable not set");
    }
    
    // Verify we don't exceed the maximum images per request
    if (images.length > MAX_IMAGES_PER_REQUEST) {
      throw new Error(`Too many images in one request: ${images.length}. Maximum: ${MAX_IMAGES_PER_REQUEST}`);
    }
    
    // Build the message content with all images in the batch
    const messageContent = [
      {
        type: "text",
        text: "This is an agricultural area-based support document (SAPS). Please extract all the following information in JSON format:\n" +
              "1. submitterName: the name of the submitter\n" +
              "2. submitterId: the submitter's client ID number, a numeric value\n" +
              "3. applicantId: the applicant's client ID number (may be the same as submitter)\n" +
              "4. submissionDate: the exact date and time when the document was submitted\n" +
              "5. blockIds: an array of block identifiers (format like XXXNNNNN or similar, usually prefixed with 'BLOKK:')\n" +
              "6. currentYearCrops: array of crops for the current year with hectares\n" +
              "7. historicalData: array of previous 5 years data with this structure:\n" +
              "   {\n" +
              "     year: 'YYYY',\n" +
              "     totalHectares: number,\n" +
              "     crops: [\n" +
              "       {\n" +
              "         name: 'crop name',\n" +
              "         hectares: number,\n" +
              "         yield: number (tons per hectare),\n" +
              "         totalYield: number (total tons)\n" +
              "       }\n" +
              "     ]\n" +
              "   }\n" +
              "\nOnly return the extracted data in this JSON format."
      }
    ];
    
    // Collect valid images
    const validImageUrls = [];
    const invalidImageUrls = [];
    const unsupportedFormatUrls = [];
    
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
        
        // Use the URL format that Claude accepts
        messageContent.push({
          type: "image",
          source: {
            type: "url",
            url: imageUrl
          }
        });
        
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
    
    if (validImageUrls.length === 0) {
      throw new Error(`No valid images found in the batch. All ${images.length} images were invalid or in unsupported formats.`);
    }
    
    console.log(`✅ Proceeding with ${validImageUrls.length} valid images for Claude API processing`);
    
    // Construct Claude API request
    const payload = {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0,
      system: "You are an assistant specialized in analyzing agricultural documents. Read the SAPS documents accurately to extract all requested information. If a field cannot be found, leave it as null. Be meticulous in identifying block IDs which are 8-digit codes often containing letters and numbers, usually prefixed with 'BLOKK:'. For historical crop data, calculate average market prices in EUR/ton for each crop type to estimate annual revenue. Current year supported crops should include estimated market prices as well.",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ]
    };
    
    console.log(`🚀 Sending Claude API request: ${CLAUDE_API_URL}, model: ${CLAUDE_MODEL}, with ${validImageUrls.length} images`);
    
    // Log a sample of the request for debugging
    console.log(`Request summary: model=${payload.model}, images=${validImageUrls.length}, prompt size=${payload.messages[0].content[0].text.length} chars`);
    
    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": claudeApiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Claude API error: ${response.status} - ${errorText}`);
      
      // Try to extract more meaningful error information
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error?.message || errorJson.error || errorText;
        throw new Error(`Claude API error: ${response.status} - ${errorMessage}`);
      } catch (parseError) {
        throw new Error(`Claude API error: ${response.status} - ${errorText}`);
      }
    }
    
    const result = await response.json();
    console.log(`✅ Claude API response received. Content type: ${result.content?.[0]?.type}, length: ${result.content?.[0]?.text?.length || 0} chars`);
    
    // Extract the JSON response from Claude's text output
    let extractedData = {};
    let rawText = "";
    
    if (result.content && result.content.length > 0) {
      // The response should be a JSON string
      rawText = result.content[0].text;
      
      try {
        // Try to extract JSON from the text response
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          extractedData = JSON.parse(jsonMatch[0]);
          console.log(`✅ Data extracted: ${JSON.stringify(extractedData, null, 2)}`);
        } else {
          console.warn(`⚠️ Could not extract JSON data from the response`);
        }
      } catch (parseError) {
        console.error(`❌ JSON parsing error: ${parseError.message}`);
      }
    }
    
    // Add estimated EUR prices to historical crops
    if (extractedData.historicalData && Array.isArray(extractedData.historicalData)) {
      extractedData.historicalData = extractedData.historicalData.map(yearData => {
        if (yearData.crops && Array.isArray(yearData.crops)) {
          // Estimate market prices (EUR/ton) for each crop - these are example values
          const estimatedPrices = {
            'Kukorica': 180, // Corn
            'Búza': 220,     // Wheat
            'Napraforgó': 400, // Sunflower
            'Repce': 420,    // Rapeseed
            'Árpa': 190,     // Barley
            'Szója': 380,    // Soy
            'Zab': 210,      // Oats
            'Rozs': 180      // Rye
          };
          
          // Default price for unknown crops
          const defaultPrice = 200;
          
          // Calculate revenue for each crop
          yearData.crops = yearData.crops.map(crop => {
            const cropName = crop.name;
            const estimatedPriceEUR = estimatedPrices[cropName] || defaultPrice;
            const totalYield = crop.totalYield || (crop.yield * crop.hectares);
            const revenueEUR = totalYield * estimatedPriceEUR;
            
            return {
              ...crop,
              priceEUR: estimatedPriceEUR,
              revenueEUR: revenueEUR
            };
          });
          
          // Calculate total revenue for the year
          const totalRevenueEUR = yearData.crops.reduce((sum, crop) => sum + (crop.revenueEUR || 0), 0);
          
          return {
            ...yearData,
            totalRevenueEUR: totalRevenueEUR
          };
        }
        return yearData;
      });
    }
    
    // Add estimated market prices to current year crops
    if (extractedData.currentYearCrops && Array.isArray(extractedData.currentYearCrops)) {
      // Estimate current market prices (EUR/ton) for each crop - these are example values
      const currentPrices = {
        'Kukorica': 195, // Corn
        'Búza': 235,     // Wheat
        'Napraforgó': 420, // Sunflower
        'Repce': 440,    // Rapeseed
        'Árpa': 200,     // Barley
        'Szója': 400,    // Soy
        'Zab': 220,      // Oats
        'Rozs': 190      // Rye
      };
      
      // Default price for unknown crops
      const defaultPrice = 220;
      
      // Average yields per hectare for different crops (tons/hectare)
      const averageYields = {
        'Kukorica': 8.0, // Corn
        'Búza': 5.5,     // Wheat
        'Napraforgó': 3.0, // Sunflower
        'Repce': 3.2,    // Rapeseed
        'Árpa': 5.0,     // Barley
        'Szója': 2.8,    // Soy
        'Zab': 4.0,      // Oats
        'Rozs': 4.5      // Rye
      };
      
      // Default yield for unknown crops
      const defaultYield = 4.0;
      
      // Calculate revenue for each crop
      extractedData.currentYearCrops = extractedData.currentYearCrops.map(crop => {
        const cropName = crop.name;
        const priceEUR = currentPrices[cropName] || defaultPrice;
        const yieldPerHectare = averageYields[cropName] || defaultYield;
        const totalYield = yieldPerHectare * crop.hectares;
        const revenueEUR = totalYield * priceEUR;
        
        return {
          ...crop,
          yieldPerHectare,
          priceEUR,
          totalYield,
          revenueEUR
        };
      });
      
      // Calculate total revenue for current year
      extractedData.currentYearTotalRevenueEUR = extractedData.currentYearCrops.reduce(
        (sum, crop) => sum + (crop.revenueEUR || 0), 
        0
      );
    }
    
    // Log batch processing results
    try {
      const { data, error } = await supabase
        .from('document_batch_results')
        .insert({
          batch_id: batchId,
          user_id: userId,
          batch_index: batchIndex,
          total_batches: totalBatches,
          extracted_data: extractedData,
          raw_response: rawText,
          image_count: validImageUrls.length,
          images_processed: validImageUrls
        })
        .select('id')
        .single();
        
      if (error) {
        console.error(`❌ Error saving batch results:`, error);
        console.error(`Error details:`, JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ Batch results saved: ${data.id}`);
      }
    } catch (dbError) {
      console.error(`❌ Database error while saving batch results:`, dbError);
      // Continue processing despite database error
    }
    
    // Check if we found any useful data
    const hasUsefulData = extractedData && 
                         (extractedData.submitterName || extractedData.submitterId || extractedData.applicantId);
    
    return {
      extractedData,
      rawText,
      hasUsefulData,
      batchIndex,
      totalBatches,
      imageCount: validImageUrls.length
    };
    
  } catch (error) {
    console.error(`❌ Claude processing error: ${error.message}`);
    throw error;
  }
}

/**
 * Process all batches of images sequentially until we get useful data
 */
export async function processAllImageBatches(
  imageUrls: string[],
  userId: string,
  batchId: string
) {
  console.log(`🔄 Starting all image batch processing: ${imageUrls.length} images`);
  
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
  console.log(`📄 First few image URLs for verification:`);
  supportedUrls.slice(0, 3).forEach((url, i) => {
    console.log(`   ${i+1}: ${url}`);
  });
  
  if (supportedUrls.length === 0) {
    throw new Error("No valid and supported image URLs found to process");
  }
  
  // Split images into batches of MAX_IMAGES_PER_REQUEST
  const batches = [];
  for (let i = 0; i < supportedUrls.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(supportedUrls.slice(i, i + MAX_IMAGES_PER_REQUEST));
  }
  
  console.log(`📦 Number of batches: ${batches.length}`);
  
  let allExtractedData = {};
  let foundUsefulData = false;
  let processedBatches = 0;
  let failedBatches = 0;
  let lastError = null;
  
  // Process each batch sequentially until we find useful data
  for (let i = 0; i < batches.length; i++) {
    console.log(`⏳ Processing batch ${i+1}/${batches.length}...`);
    
    try {
      const result = await processImageBatchWithClaude(
        batches[i],
        userId,
        batchId,
        i + 1,
        batches.length
      );
      
      processedBatches++;
      
      // Merge any extracted data
      allExtractedData = {
        ...allExtractedData,
        ...result.extractedData
      };
      
      // Check if we found useful data
      if (result.hasUsefulData) {
        console.log(`✅ Found useful data in batch ${i+1}, stopping processing`);
        foundUsefulData = true;
        break;
      }
    } catch (batchError) {
      console.error(`❌ Error processing batch ${i+1}:`, batchError);
      failedBatches++;
      lastError = batchError;
      // Continue with next batch instead of failing completely
      continue;
    }
  }
  
  // If all batches failed, throw the last error
  if (processedBatches === 0 && failedBatches > 0 && lastError) {
    throw new Error(`All batches failed to process. Last error: ${lastError.message}`);
  }
  
  // Update the batch status in the database
  try {
    const { error } = await supabase
      .from('document_batches')
      .update({
        status: foundUsefulData ? 'completed' : 'failed',
        metadata: {
          foundUsefulData,
          processedAt: new Date().toISOString(),
          extractedData: allExtractedData,
          processedBatches,
          failedBatches
        }
      })
      .eq('batch_id', batchId);
      
    if (error) {
      console.error(`❌ Error updating batch status:`, error);
      console.error(`Error details:`, JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Batch status updated to ${foundUsefulData ? 'completed' : 'failed'}`);
    }
  } catch (updateError) {
    console.error(`❌ Database error while updating batch status:`, updateError);
    // Continue processing despite database error
  }
  
  // Create farm data structure from the extracted data
  const farmData = {
    applicantName: allExtractedData.submitterName || null,
    submitterId: allExtractedData.submitterId || null,
    applicantId: allExtractedData.applicantId || null,
    documentId: allExtractedData.submitterId || null,
    submissionDate: allExtractedData.submissionDate || null,
    region: null,
    year: new Date().getFullYear().toString(),
    hectares: allExtractedData.currentYearCrops?.reduce((sum, crop) => sum + (crop.hectares || 0), 0) || 0,
    cultures: allExtractedData.currentYearCrops?.map(crop => ({
      name: crop.name,
      hectares: crop.hectares,
      yieldPerHectare: crop.yieldPerHectare,
      pricePerTon: crop.priceEUR * 390, // Convert EUR to HUF with approximate exchange rate
      estimatedRevenue: crop.revenueEUR * 390 // Convert EUR to HUF
    })) || [],
    blockIds: allExtractedData.blockIds || [],
    totalRevenue: (allExtractedData.currentYearTotalRevenueEUR || 0) * 390, // Convert EUR to HUF
    historicalData: allExtractedData.historicalData || [],
    rawText: JSON.stringify(allExtractedData)
  };
  
  return {
    data: farmData,
    rawText: JSON.stringify(allExtractedData),
    success: foundUsefulData,
    batchInfo: {
      totalBatches: batches.length,
      processedBatches: processedBatches,
      failedBatches: failedBatches,
      totalPages: supportedUrls.length,
      processedPages: foundUsefulData ? 
        Math.min(processedBatches * MAX_IMAGES_PER_REQUEST, supportedUrls.length) : 
        supportedUrls.length
    }
  };
}
