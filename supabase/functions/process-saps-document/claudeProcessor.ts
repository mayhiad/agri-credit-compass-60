
// Claude API processor for document extraction
import { encode as base64Encode } from "https://deno.land/std@0.82.0/encoding/base64.ts";

// Claude API constants
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-opus-20240229";
const MAX_IMAGES_PER_REQUEST = 20; // Claude API limit

/**
 * Processes a document with Claude API in batches
 */
export async function processDocumentWithClaude(fileBuffer: ArrayBuffer, fileName: string) {
  console.log(`🧠 Claude AI feldolgozás kezdése a dokumentumon: ${fileName}`);
  
  try {
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!claudeApiKey) {
      throw new Error("ANTHROPIC_API_KEY környezeti változó nincs beállítva");
    }
    
    // Check if we're dealing with PDF or image(s)
    const isPdf = fileName.toLowerCase().endsWith('.pdf');
    
    // If it's a PDF, we'll need to convert it to images or handle it differently
    // For this example, we'll assume we have an array of image buffers
    // In a real implementation, you'd use a PDF to image conversion service
    
    // Convert file to base64
    const fileContent = base64Encode(new Uint8Array(fileBuffer));
    const fileType = isPdf ? 'application/pdf' : 'application/octet-stream';
    
    console.log(`🔄 Fájl átalakítva Base64 formátumba, méret: ${fileContent.length} karakter`);
    
    // For now, we'll process as a single batch in this simplified example
    // In a real implementation with multiple images, you'd split them into batches of MAX_IMAGES_PER_REQUEST
    
    // Construct Claude API request
    const payload = {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0,
      system: "Te egy mezőgazdasági adatok elemzésére szakosodott asszisztens vagy. Pontosan olvasd ki a dokumentumokból a kért információkat. Ne találj ki adatokat, és ha nem vagy biztos valamiben, inkább hagyd üresen. Az eredményt mindig csak a kért JSON formátumban add vissza.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Ez egy mezőgazdasági területalapú támogatási dokumentum. Kérlek, keresd meg és add vissza JSON formátumban a következő adatokat:\n" +
                    "- submitterName: a beadó neve, amely általában az első oldalon található\n" +
                    "- submitterId: a beadó ügyfél-azonosító száma, egy 10 számjegyű szám\n" +
                    "- applicantId: a kérelmező ügyfél-azonosító száma, egy 10 számjegyű szám (adott esetben megegyezik a beadó személyével)\n\n" +
                    "Csak a következő JSON formátumot add vissza: { \"submitterName\": \"...\", \"submitterId\": \"...\", \"applicantId\": \"...\" }"
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: fileType,
                data: fileContent
              }
            }
          ]
        }
      ]
    };
    
    console.log(`🚀 Claude API kérés küldése: ${CLAUDE_API_URL}, model: ${CLAUDE_MODEL}`);
    
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
      console.error(`❌ Claude API hiba: ${response.status} - ${errorText}`);
      throw new Error(`Claude API hiba: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log(`✅ Claude API válasz megérkezett:`, result);
    
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
          console.log(`✅ Adatok kinyerve: ${JSON.stringify(extractedData)}`);
        } else {
          console.warn(`⚠️ Nem sikerült JSON adatot kinyerni a válaszból`);
        }
      } catch (parseError) {
        console.error(`❌ JSON elemzési hiba: ${parseError.message}`);
      }
    }
    
    // Create farm data structure from the extracted data
    const farmData = {
      applicantName: extractedData.submitterName || null,
      documentId: extractedData.submitterId || null,
      submitterId: extractedData.submitterId || null,
      applicantId: extractedData.applicantId || null,
      region: null,
      year: new Date().getFullYear().toString(),
      hectares: 0,
      cultures: [],
      blockIds: [],
      totalRevenue: 0,
      rawText: rawText
    };
    
    return {
      data: farmData,
      rawText: rawText,
      success: true,
      batchInfo: {
        totalBatches: 1,
        processedBatches: 1,
        totalPages: 1,
        processedPages: 1
      }
    };
    
  } catch (error) {
    console.error(`❌ Claude feldolgozási hiba: ${error.message}`);
    throw error;
  }
}

/**
 * Process a batch of images with Claude API
 * This would be implemented in a real-world scenario for handling multiple images
 */
async function processBatchWithClaude(
  images: {data: string, type: string}[], 
  apiKey: string, 
  prompt: string
) {
  // Implementation for processing a batch of images
  // This is a placeholder for the actual implementation
  return {
    rawText: "",
    data: {}
  };
}
