
import { batchArray, sortFilesByPageNumber } from "./utils.ts";

export const processAllImageBatches = async (
  imageUrls: string[],
  userId: string,
  batchId: string,
  processingId: string
) => {
  // Maximum number of images to process in a batch
  const MAX_BATCH_SIZE = 20;
  
  // Sort images by page number to ensure we process in page order
  const sortedImageUrls = [...imageUrls];
  
  // Split images into batches
  const batches = batchArray(sortedImageUrls, MAX_BATCH_SIZE);
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
  
  // Process batches sequentially in order (1-20, 21-40, etc.)
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
  
  const systemPrompt = `Te egy mesterséges intelligencia asszisztens vagy, aki magyar SAPS (Egységes Területalapú Támogatás) mezőgazdasági dokumentumokból strukturált adatok kinyerésére specializálódott. Feladatod a kérelmezőről, a mezőgazdasági blokkokról, kultúrákról, földterületekről és historikus növénytermesztési adatokról az összes információ kinyerése.

FONTOS: Mindig az alábbi struktúrájú, érvényes JSON objektumot kell visszaadnod, kizárólag ezekkel a mezőkkel:
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

RÉSZLETES UTASÍTÁSOK:

## 1.1 - ALAPADATOK
Az alapadatok a SAPS dokumentum első oldalán találhatók mindig. Itt keresd:
1. A kérelmező nevét ("kérelmező neve")
2. Az ügyfél-azonosítót ("ügyfél-azonosító" vagy "regisztrációs szám")
3. A dokumentumazonosítót
4. A tárgyévet
5. A benyújtás dátumát ("Benyújtás dátuma")

## 1.2 - BLOKKOK
A blokkok a "14 Területek összesítése hasznosítási adatok szerint" és a "16 EFA területek összesítése" között található "15 Területek összesítése blokkhasználat szerint" modulban találhatók. Ebben a részben:
1. Keresd a blokkokat, melyek általában alfanumerikus kódok (pl. "C1N7J518")
2. A blokkok mellett találhatók az adott kódjelű blokkhoz tartó területméret hektárban
3. Számold ki az összes blokk teljes területméretét (hektár) - ezt az értéket add meg a "blokkok összesített mérete" mezőben
4. A teljes hektárméret a blokkok mellett lévő értékek összege

## 1.3 - HISTORIKUS ADATOK
A historikus adatokat a "10 Változásvezetés" és a "12 Növényvédelmi szakirányító nyilatkozat" között található "11 Kárenyhítés/Biztosítási díjtámogatás" modulban keresd, azon belül a "Termésmennyiség megadása a mezőgazdasági termelést érintő időjárási és más természeti kockázatok kezelésére szolgáló rendszer keretében" részben:
1. Ez a táblázat tartalmazza az elmúlt 5 év adatait - add vissza JSON-ban, hogy mely évek ezek
2. Minden évhez tartozik terület (ha) és termés (t) adat - a sorszámok mutatják, hogy melyik kultúráról van szó. Amennyiben a kultúra (sor) és az "[x] évi
terület(ha)" histórikus év metszetében van egy szám, az azt jelenti, hogy az adott kulturát ennyi hektáron termesztették abban az évben.
Amennyiben a kultúra (sor) és az "[x] évi
termésm(t)" metszetében van egy érték, az azt jelenti, hogy az adott kultúrából ekkora mennyiséget termeltek hektáronként abban az évben. A kettő szorzata (hektár mennyisége) x (termésm(t)) megadja, hogy adott évben ÖSSZESEN hány tonna mennyiséget termeltek a kultúrából. 
3. Az egyes kultúrák soronként vannak felsorolva
4. Minden kultúránál meg kell vizsgálni, az adott évben (oszlopban) van-e hozzá megfelelő érték, akár a hektárt, akár a tonnát tekintve.
5. A kiolvasott adatokat json-ban kell visszaadni

## 1.4 - TÁRGYÉVI ADATOK (KULTÚRÁK)
A tárgyévi kultúrák adatai a "17 Diverzifikáció összesítése" modulban találhatók:
1. Itt keresd a kultúrákat és a hozzájuk tartozó területeket hektárban (ha)
2. Ezeket az adatokat a "cultures" tömbben add vissza
3. Minden kultúrához tartozik egy név és egy területméret hektárban

EGYÉB UTASÍTÁSOK:
1. Ha nem találsz bizonyos információkat, használj "N/A" értéket szöveges mezőknél és 0-t numerikus értékeknél.
2. NE TALÁLJ KI VAGY BECSÜLJ ADATOKAT. Ha bizonytalan vagy, használj "N/A" vagy 0 értéket.
3. KIZÁRÓLAG a JSON objektumot add vissza, további szöveg vagy magyarázat nélkül.
4. NE HASZNÁLJ helyőrző adatokat, mint például "Szántóföldi kultúra" 123.45 hektárral. Ha nem tudod kinyerni a valós adatokat, állíts be üres tömböt.

FONTOS: A dokumentum magyar nyelvű, ezért keresd ezeket a kulcsszavakat: "kérelmező", "ügyfél-azonosító", "blokkazonosító", "hektár", "terület", "tárgyév", "benyújtás dátuma", "kárenyhítés", stb.`;

  const userPrompt = `Nyerd ki az összes szükséges információt ezekből a SAPS dokumentum oldalakból. Emlékezz, hogy KIZÁRÓLAG a megadott struktúrájú, érvényes JSON objektumot add vissza, amely tartalmazza az összes információt, amit találsz a kérelmezőről, blokkokról, földterületekről, kultúrákról, benyújtási dátumról, évről és historikus növénytermesztési adatokról.`;
  
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
