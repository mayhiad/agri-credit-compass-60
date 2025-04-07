
// Claude API processor for document extraction
import { encode as base64Encode } from "https://deno.land/std@0.82.0/encoding/base64.ts";
import { supabase } from "./openaiClient.ts";

// Claude API constants
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-3-opus-20240229";
const MAX_IMAGES_PER_REQUEST = 20; // Claude API limit

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
  console.log(`🧠 Claude AI feldolgozás kezdése a ${batchIndex}/${totalBatches}. képkötegen: ${images.length} kép`);
  
  try {
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!claudeApiKey) {
      throw new Error("ANTHROPIC_API_KEY környezeti változó nincs beállítva");
    }
    
    // Verify we don't exceed the maximum images per request
    if (images.length > MAX_IMAGES_PER_REQUEST) {
      throw new Error(`Túl sok kép egy kérésben: ${images.length}. Maximum: ${MAX_IMAGES_PER_REQUEST}`);
    }
    
    // Build the message content with all images in the batch
    const messageContent = [
      {
        type: "text",
        text: "Ez egy mezőgazdasági területalapú támogatási dokumentum. Kérlek, keresd meg és add vissza JSON formátumban a következő adatokat:\n" +
              "- submitterName: a beadó neve, amely általában az első oldalon található\n" +
              "- submitterId: a beadó ügyfél-azonosító száma, egy 10 számjegyű szám\n" +
              "- applicantId: a kérelmező ügyfél-azonosító száma, egy 10 számjegyű szám (adott esetben megegyezik a beadó személyével)\n\n" +
              "Csak a következő JSON formátumot add vissza: { \"submitterName\": \"...\", \"submitterId\": \"...\", \"applicantId\": \"...\" }"
      }
    ];
    
    // Add all images to the message content
    for (const imageUrl of images) {
      // Check if URL is publicly accessible
      if (imageUrl.includes('supabase.co')) {
        messageContent.push({
          type: "image",
          source: {
            type: "url",
            url: imageUrl
          }
        });
      } else {
        throw new Error(`A kép URL nem nyilvános: ${imageUrl}`);
      }
    }
    
    // Construct Claude API request
    const payload = {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0,
      system: "Te egy mezőgazdasági adatok elemzésére szakosodott asszisztens vagy. Pontosan olvasd ki a dokumentumokból a kért információkat. Ne találj ki adatokat, és ha nem vagy biztos valamiben, inkább hagyd üresen. Az eredményt mindig csak a kért JSON formátumban add vissza.",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ]
    };
    
    console.log(`🚀 Claude API kérés küldése: ${CLAUDE_API_URL}, model: ${CLAUDE_MODEL}, ${images.length} képpel`);
    
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
    
    // Log batch processing results
    const { data, error } = await supabase
      .from('document_batch_results')
      .insert({
        batch_id: batchId,
        user_id: userId,
        batch_index: batchIndex,
        total_batches: totalBatches,
        extracted_data: extractedData,
        raw_response: rawText,
        image_count: images.length,
        images_processed: images
      })
      .select('id')
      .single();
      
    if (error) {
      console.error(`❌ Hiba a batch eredmények mentésekor:`, error);
    } else {
      console.log(`✅ Batch eredmények mentve: ${data.id}`);
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
      imageCount: images.length
    };
    
  } catch (error) {
    console.error(`❌ Claude feldolgozási hiba: ${error.message}`);
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
  console.log(`🔄 Összes képköteg feldolgozása kezdődik: ${imageUrls.length} kép`);
  
  // Split images into batches of MAX_IMAGES_PER_REQUEST
  const batches = [];
  for (let i = 0; i < imageUrls.length; i += MAX_IMAGES_PER_REQUEST) {
    batches.push(imageUrls.slice(i, i + MAX_IMAGES_PER_REQUEST));
  }
  
  console.log(`📦 Kötegek száma: ${batches.length}`);
  
  let allExtractedData = {};
  let foundUsefulData = false;
  
  // Process each batch sequentially until we find useful data
  for (let i = 0; i < batches.length; i++) {
    console.log(`⏳ ${i+1}/${batches.length}. köteg feldolgozása...`);
    
    const result = await processImageBatchWithClaude(
      batches[i],
      userId,
      batchId,
      i + 1,
      batches.length
    );
    
    // Merge any extracted data
    allExtractedData = {
      ...allExtractedData,
      ...result.extractedData
    };
    
    // Check if we found useful data
    if (result.hasUsefulData) {
      console.log(`✅ Használható adatokat találtunk a ${i+1}. kötegben, megállítjuk a feldolgozást`);
      foundUsefulData = true;
      break;
    }
  }
  
  // Update the batch status in the database
  const { error } = await supabase
    .from('document_batches')
    .update({
      status: foundUsefulData ? 'completed' : 'failed',
      metadata: {
        foundUsefulData,
        processedAt: new Date().toISOString(),
        extractedData: allExtractedData
      }
    })
    .eq('batch_id', batchId);
    
  if (error) {
    console.error(`❌ Hiba a batch státusz frissítésekor:`, error);
  }
  
  // Create farm data structure from the extracted data
  const farmData = {
    applicantName: allExtractedData.submitterName || null,
    documentId: allExtractedData.submitterId || null,
    submitterId: allExtractedData.submitterId || null,
    applicantId: allExtractedData.applicantId || null,
    region: null,
    year: new Date().getFullYear().toString(),
    hectares: 0,
    cultures: [],
    blockIds: [],
    totalRevenue: 0,
    rawText: JSON.stringify(allExtractedData)
  };
  
  return {
    data: farmData,
    rawText: JSON.stringify(allExtractedData),
    success: foundUsefulData,
    batchInfo: {
      totalBatches: batches.length,
      processedBatches: foundUsefulData ? batches.findIndex(b => b.includes(imageUrls[0])) + 1 : batches.length,
      totalPages: imageUrls.length,
      processedPages: foundUsefulData ? 
        (batches.findIndex(b => b.includes(imageUrls[0])) + 1) * MAX_IMAGES_PER_REQUEST : 
        imageUrls.length
    }
  };
}
