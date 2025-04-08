
import { batchArray, sortFilesByPageNumber } from "./utils.ts";

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
    applicantName: "N/A",
    submitterId: "N/A",
    applicantId: "N/A",
    documentId: "N/A",
    year: "N/A",
    submissionDate: "N/A",
    hectares: 0,
    cultures: [],
    blockIds: [],
    totalRevenue: 0,
    historicalYears: []
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
        
        if (batchResult.data.year && batchResult.data.year !== "N/A") {
          combinedResult.year = batchResult.data.year;
        }
        
        if (batchResult.data.submissionDate && batchResult.data.submissionDate !== "N/A") {
          combinedResult.submissionDate = batchResult.data.submissionDate;
        }
        
        // Remove fallback data for hectares
        if (batchResult.data.hectares && batchResult.data.hectares > 0 && !(batchResult.data.hectares === 123.45)) {
          combinedResult.hectares = batchResult.data.hectares;
        }
        
        if (batchResult.data.totalRevenue && batchResult.data.totalRevenue > 0) {
          combinedResult.totalRevenue = batchResult.data.totalRevenue;
        }
        
        if (batchResult.data.blockIds && batchResult.data.blockIds.length > 0) {
          combinedResult.blockIds = [...new Set([...combinedResult.blockIds, ...batchResult.data.blockIds])];
        }
        
        if (batchResult.data.cultures && batchResult.data.cultures.length > 0) {
          // Filter out the fallback culture data
          const validCultures = batchResult.data.cultures.filter(culture => 
            !(culture.name === "Szántóföldi kultúra" && culture.hectares === 123.45)
          );
          
          if (validCultures.length > 0) {
            // Combine cultures from different batches
            const existingCultureNames = new Set(combinedResult.cultures.map((c: any) => c.name));
            for (const culture of validCultures) {
              if (!existingCultureNames.has(culture.name)) {
                combinedResult.cultures.push(culture);
                existingCultureNames.add(culture.name);
              }
            }
          }
        }
        
        if (batchResult.data.historicalYears && batchResult.data.historicalYears.length > 0) {
          // Combine historical years data
          if (!combinedResult.historicalYears || combinedResult.historicalYears.length === 0) {
            combinedResult.historicalYears = batchResult.data.historicalYears;
          } else {
            // Merge historical years data if we already have some
            const existingYears = new Set(combinedResult.historicalYears.map((y: any) => y.year));
            for (const yearData of batchResult.data.historicalYears) {
              if (!existingYears.has(yearData.year)) {
                combinedResult.historicalYears.push(yearData);
                existingYears.add(yearData.year);
              }
            }
          }
        }
      }
      
      // If we have found all required information, we can stop processing
      const allRequiredDataFound = 
        combinedResult.applicantName !== "N/A" &&
        combinedResult.submitterId !== "N/A" &&
        combinedResult.applicantId !== "N/A" &&
        combinedResult.submissionDate !== "N/A" &&
        combinedResult.year !== "N/A" &&
        combinedResult.blockIds.length > 0 &&
        combinedResult.cultures.length > 0 &&
        combinedResult.hectares > 0;
        
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
  
  const systemPrompt = `You are an AI assistant specialized in extracting structured information from Hungarian SAPS (Single Area Payment Scheme) agricultural documents. Extract all information about the applicant, agriculture blocks, cultures, land areas, and historical crop data.

IMPORTANT: Always return a valid JSON object with the following structure, using only these exact fields:
{
  "applicantName": string,
  "submitterId": string,
  "applicantId": string,
  "documentId": string,
  "year": string,
  "submissionDate": string,
  "hectares": number,
  "cultures": [
    {
      "name": string,
      "hectares": number
    }
  ],
  "blockIds": string[],
  "historicalYears": [
    {
      "year": string,
      "totalHectares": number,
      "crops": [
        {
          "name": string,
          "hectares": number,
          "yield": number,
          "totalYield": number
        }
      ]
    }
  ]
}

SPECIFIC INSTRUCTIONS:
1. Extract the applicant's name ("kérelmező neve") and ID numbers ("ügyfél-azonosító").
2. Find all block IDs which look like alphanumeric codes (e.g., "C1N7J518").
3. Extract all crop types ("kultúra") and their corresponding areas in hectares.
4. The total hectares should be the sum of all culture areas.
5. Find the submission date of the document ("Benyújtás dátuma") and the year it refers to ("Tárgyév").
6. If you can't find certain information, use "N/A" for string values and 0 for numeric values.
7. DON'T MAKE UP OR ESTIMATE DATA. If you're uncertain, use "N/A" or 0.
8. Return ONLY the JSON object with no additional text or explanation.
9. DO NOT USE placeholder data like "Szántóföldi kultúra" with 123.45 hectares. If you can't extract the real data, set cultures to an empty array.

## HISTORICAL DATA EXTRACTION
For historical data ("historikus adatok"), look for tables showing crop data from previous years:

1. Look for sections titled "Kárenyhtés", "Biztosítási díjtámogatás", or "Termésmennyiség megadása".
2. Find tables that show multiple years side by side (in columns).
3. These tables typically contain:
   - Years (e.g., "2016 évi terület(ha)", "2016 évi termés(t)")
   - Crop codes (e.g., KAL01, IND23) and names (e.g., Őszi búza, Napraforgó)
   - Area data in hectares
   - Yield data in tons
4. Often found in the first third of the document.
5. May be under heading "Termésmenyiség megadása a mezőgazdasági termelést érintő időjárási és más természeti kockázatok kezelésére szolgáló rendszer keretében".
6. Make sure to capture data for all crops, including those grown in smaller areas.
7. Data is typically in tables with crops in rows and years in columns.
8. Check for both area (ha) and yield (t) data for each crop and for each year listed.

## 1.3 - Histórikus adatok:

| Kultúra | [Év1] |  | [Év2] |  | [Év3] |  | [Év4] |  | [Év5] |  |
|---------|------|------|------|------|------|------|------|------|------|------|
|         | ha | t | ha | t | ha | t | ha | t | ha | t |
| [Kultúra1] | [érték] | [érték] | ... | ... | ... | ... | ... | ... | ... | ... |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| **Összesen** | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] | [összeg] |

NOTE: These documents may be in Hungarian. Look for words like "kérelmező", "ügyfél-azonosító", "blokkazonosító", "hektár", "terület", "dátum", "benyújtás dátuma", "tárgyév", etc.`;

  const userPrompt = `Extract all required information from these SAPS document pages. Remember to return ONLY a valid JSON object with the exact structure specified, containing all the information you can find about the applicant, blocks, land areas, cultures, submission date, year, and historical crop data.`;
  
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
        
        // Filter out fallback data
        if (extractedData.cultures) {
          extractedData.cultures = extractedData.cultures.filter(
            (culture: any) => !(culture.name === "Szántóföldi kultúra" && culture.hectares === 123.45)
          );
        }
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
