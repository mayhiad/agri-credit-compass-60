import { batchArray } from "./utils.ts";

export const processAllImageBatches = async (
  imageUrls: string[],
  userId: string,
  batchId: string,
  processingId: string
) => {
  // Maximum number of images to process in a batch
  const MAX_BATCH_SIZE = 20;
  
  // Split images into batches
  const batches = batchArray(imageUrls, MAX_BATCH_SIZE);
  console.log(`🧩 Split ${imageUrls.length} images into ${batches.length} batches for processing`);
  
  // Process each batch sequentially
  let combinedResult: any = {
    // Initialize with empty values - don't provide fallback values
    applicantName: "N/A",
    submitterId: "N/A",
    applicantId: "N/A",
    region: "N/A",
    year: "N/A",
    hectares: 0,
    cultures: [],
    blockIds: [],
    totalRevenue: 0
  };
  
  let rawText = "";
  let finalClaudeResponseUrl = null;
  let batchInfo = {
    totalBatches: batches.length,
    processedBatches: 0,
    processedPages: 0,
    totalPages: imageUrls.length
  };
  
  // Process batches sequentially
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`⏳ Processing batch ${i + 1}/${batches.length} with ${batch.length} images`);
    
    try {
      const batchResult = await processImageBatch(batch, userId, batchId, processingId, i);
      rawText += batchResult.rawText || "";
      
      // Keep track of URLs for Claude responses
      if (batchResult.claudeResponseUrl) {
        finalClaudeResponseUrl = batchResult.claudeResponseUrl;
      }
      
      // Update batch progress info
      batchInfo.processedBatches = i + 1;
      batchInfo.processedPages += batch.length;
      
      // Update combined results
      if (batchResult.data) {
        // Only merge if we have actual data
        if (batchResult.data.applicantName && batchResult.data.applicantName !== "N/A") {
          combinedResult.applicantName = batchResult.data.applicantName;
        }
        
        if (batchResult.data.submitterId && batchResult.data.submitterId !== "N/A") {
          combinedResult.submitterId = batchResult.data.submitterId;
        }
        
        if (batchResult.data.applicantId && batchResult.data.applicantId !== "N/A") {
          combinedResult.applicantId = batchResult.data.applicantId;
        }
        
        if (batchResult.data.documentId && batchResult.data.documentId !== "N/A") {
          combinedResult.documentId = batchResult.data.documentId;
        }
        
        if (batchResult.data.region && batchResult.data.region !== "N/A") {
          combinedResult.region = batchResult.data.region;
        }
        
        if (batchResult.data.year && batchResult.data.year !== "N/A") {
          combinedResult.year = batchResult.data.year;
        }
        
        if (batchResult.data.hectares && batchResult.data.hectares > 0) {
          combinedResult.hectares = batchResult.data.hectares;
        }
        
        if (batchResult.data.totalRevenue && batchResult.data.totalRevenue > 0) {
          combinedResult.totalRevenue = batchResult.data.totalRevenue;
        }
        
        if (batchResult.data.blockIds && batchResult.data.blockIds.length > 0) {
          combinedResult.blockIds = [...new Set([...combinedResult.blockIds, ...batchResult.data.blockIds])];
        }
        
        if (batchResult.data.cultures && batchResult.data.cultures.length > 0) {
          // Combine cultures from different batches
          const existingCultureNames = new Set(combinedResult.cultures.map((c: any) => c.name));
          for (const culture of batchResult.data.cultures) {
            if (!existingCultureNames.has(culture.name)) {
              combinedResult.cultures.push(culture);
              existingCultureNames.add(culture.name);
            }
          }
        }
      }
      
      // If we have found all required information, we can stop processing
      const allRequiredDataFound = 
        combinedResult.applicantName !== "N/A" &&
        combinedResult.submitterId !== "N/A" &&
        combinedResult.applicantId !== "N/A" &&
        combinedResult.blockIds.length > 0 &&
        combinedResult.hectares > 0 &&
        combinedResult.cultures.length > 0;
        
      if (allRequiredDataFound) {
        console.log(`✅ All required data found after processing ${i + 1}/${batches.length} batches. Stopping early.`);
        break;
      }
    } catch (error) {
      console.error(`❌ Error processing batch ${i + 1}:`, error);
      console.error(`❌ Error details:`, JSON.stringify(error, null, 2));
    }
  }
  
  console.log(`✅ Processed ${batchInfo.processedBatches}/${batchInfo.totalBatches} batches`);
  
  return {
    data: combinedResult,
    rawText: rawText,
    claudeResponseUrl: finalClaudeResponseUrl,
    batchInfo: batchInfo
  };
};

async function processImageBatch(
  batchUrls: string[],
  userId: string,
  batchId: string,
  processingId: string,
  batchIndex: number
) {
  // This is a placeholder for the actual implementation
  // In real implementation, we would call Claude API here
  
  // Import Anthropic API client
  const API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
  if (!API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable");
  }
  
  console.log(`🤖 Calling Claude AI with batch ${batchIndex + 1} (${batchUrls.length} images)`);
  
  // Construct the prompt for Claude
  const imageUrlsForPrompt = batchUrls.map(url => ({
    type: "image",
    source: {
      type: "url",
      url
    }
  }));
  
  const systemPrompt = `You are an AI assistant specialized in extracting structured information from Hungarian SAPS (Single Area Payment Scheme) agricultural documents. Extract all information about the applicant, agriculture blocks, cultures, and land areas.

IMPORTANT: Always return a valid JSON object with the following structure, using only these exact fields:
{
  "applicantName": string,
  "submitterId": string,
  "applicantId": string,
  "documentId": string,
  "region": string,
  "year": string,
  "hectares": number,
  "cultures": [
    {
      "name": string,
      "hectares": number
    }
  ],
  "blockIds": string[]
}

SPECIFIC INSTRUCTIONS:
1. Extract the applicant's name ("kérelmező neve") and ID numbers ("ügyfél-azonosító").
2. Find all block IDs which look like alphanumeric codes (e.g., "C1N7J518").
3. Extract all crop types ("kultúra") and their corresponding areas in hectares.
4. The total hectares should be the sum of all culture areas.
5. If you can't find certain information, use "N/A" for string values and 0 for numeric values.
6. DON'T MAKE UP OR ESTIMATE DATA. If you're uncertain, use "N/A" or 0.
7. Return ONLY the JSON object with no additional text or explanation.

NOTE: These documents may be in Hungarian. Look for words like "kérelmező", "ügyfél-azonosító", "blokkazonosító", "hektár", "terület", etc.`;

  const userPrompt = `Extract all required information from these SAPS document pages. Remember to return ONLY a valid JSON object with the exact structure specified, containing all the information you can find about the applicant, blocks, land areas and cultures.`;
  
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              ...imageUrlsForPrompt
            ]
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Claude API error: ${response.status} ${response.statusText}`);
      console.error(`❌ Error details: ${errorText}`);
      throw new Error(`Claude API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const claudeResponse = await response.json();
    console.log(`✅ Claude response received for batch ${batchIndex + 1}`);
    
    // Extract the content from Claude's response
    const rawText = claudeResponse.content?.[0]?.text || "";
    console.log(`Raw Claude content: ${rawText.substring(0, 100)}...`);
    
    // Try to parse the JSON response
    let extractedData;
    try {
      // Look for JSON object in the response
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
        console.log(`✅ Successfully parsed JSON from Claude response`);
      } else {
        console.warn(`⚠️ No JSON object found in Claude response`);
        extractedData = null;
      }
    } catch (parseError) {
      console.error(`❌ Failed to parse JSON from Claude response:`, parseError);
      console.error(`❌ Raw text: ${rawText}`);
      extractedData = null;
    }
    
    // Return the extracted data and raw response
    return {
      data: extractedData,
      rawText: rawText,
      batchIndex: batchIndex
    };
  } catch (error) {
    console.error(`❌ Error calling Claude API:`, error);
    throw error;
  }
}

// Add utils.ts for batchArray function if it's not already there
// We can provide a simple implementation here
export const batchArray = <T>(array: T[], batchSize: number): T[][] => {
  const batches = [];
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize));
  }
  return batches;
};
