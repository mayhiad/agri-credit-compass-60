
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "./cors.ts";
import * as pdf from "https://deno.land/x/pdfjs@v0.1.2/mod.ts";

const API_TIMEOUT = 180000; // 3 perc

serve(async (req) => {
  // CORS kezelése
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 204
    });
  }

  try {
    console.log("📥 Claude AI feldolgozás indítása");
    
    // Ellenőrizzük, hogy a kérés formData típusú-e
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      console.error("🚫 Nem multipart/form-data típusú kérés érkezett");
      return new Response(JSON.stringify({
        success: false,
        error: "Érvénytelen kérés: a kérésnek multipart/form-data típusúnak kell lennie"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // FormData kinyerése
    let formData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error("🚫 FormData feldolgozási hiba:", formError);
      return new Response(JSON.stringify({
        success: false,
        error: "A formData feldolgozása sikertelen"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error("🚫 Nem érkezett fájl");
      return new Response(JSON.stringify({
        success: false,
        error: "Nem érkezett fájl"
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    console.log("📄 Fájl fogadva:", file.name, "méret:", file.size, "típus:", file.type);
    
    // Felhasználói azonosító kinyerése a JWT tokenből
    let userId = 'debug_user';
    
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map((c) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        
        const payload = JSON.parse(jsonPayload);
        if (payload.sub) {
          userId = payload.sub;
          console.log("👤 Felhasználó azonosítva:", userId);
        }
      } catch (jwtError) {
        console.warn("⚠️ Nem sikerült a JWT tokent feldolgozni:", jwtError);
      }
    }

    // Fájl tartalmának kinyerése
    const fileBuffer = await file.arrayBuffer();
    const fileText = await extractTextFromDocument(fileBuffer, file.name);
    
    if (!fileText || fileText.length < 50) {
      throw new Error(`Nem sikerült szöveget kinyerni a dokumentumból. Ellenőrizze, hogy a dokumentum nem sérült és tartalmaz szöveges információt.`);
    }
    
    console.log(`📝 Dokumentum szövege kinyerve, hossza: ${fileText.length} karakter`);
    
    // Claude API kulcs ellenőrzése
    const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
    
    if (!CLAUDE_API_KEY) {
      console.error("🔑 CLAUDE_API_KEY környezeti változó nincs beállítva!");
      return new Response(JSON.stringify({
        success: false,
        error: "Claude API kulcs nincs beállítva a Supabase Edge Function változók között"
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    // Claude API hívás a szöveg feldolgozásához
    const extractedData = await processWithClaudeAPI(fileText);
    
    // Ellenőrizzük, hogy a nevet és azonosítót sikerült-e kinyerni
    if (!extractedData.applicantName || extractedData.applicantName === "ismeretlen" || 
        !extractedData.documentId || extractedData.documentId === "ismeretlen") {
      throw new Error("A Claude AI nem tudta kinyerni a szükséges adatokat (név, azonosítószám) a dokumentumból. Kérjük ellenőrizze, hogy a feltöltött dokumentum megfelelő SAPS dokumentum-e és tartalmazza-e a gazdálkodó nevét és azonosítószámát.");
    }
    
    console.log("✅ Claude feldolgozás kész:", JSON.stringify(extractedData));

    return new Response(JSON.stringify({
      success: true,
      data: extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("🔥 Végső hibakezelés:", error);
    
    let errorMessage = "Ismeretlen hiba történt";
    let errorDetails = "";
    let errorStack = "";
    
    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.toString();
      errorStack = error.stack || "";
    } else if (typeof error === 'string') {
      errorMessage = error;
    } else if (error && typeof error === 'object') {
      errorMessage = JSON.stringify(error);
    }
    
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage, 
      details: errorDetails,
      stack: errorStack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});

// Szöveg kinyerése a dokumentumból (PDF vagy más formátum)
async function extractTextFromDocument(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  
  if (fileExtension === 'pdf') {
    try {
      // PDF feldolgozás
      const pdfDocument = await pdf.getPdfDocument(new Uint8Array(fileBuffer));
      let allText = '';
      
      // Oldalanként kinyerjük a szöveget
      for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        
        allText += pageText + '\n\n';
      }
      
      return allText;
    } catch (error) {
      console.error("PDF feldolgozási hiba:", error);
      throw new Error("PDF feldolgozási hiba: " + (error instanceof Error ? error.message : String(error)));
    }
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    // Excel esetén egyszerű üzenet
    throw new Error("Excel formátum feldolgozása nem támogatott. Kérjük, konvertálja a dokumentumot PDF formátumba a feltöltés előtt.");
  } else {
    // Egyéb formátumok
    try {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(fileBuffer);
    } catch (error) {
      console.error("Szöveg dekódolási hiba:", error);
      throw new Error("Szöveg dekódolási hiba: " + (error instanceof Error ? error.message : String(error)));
    }
  }
}

// Claude API hívás a szövegfeldolgozáshoz
async function processWithClaudeAPI(documentText: string) {
  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
  
  if (!CLAUDE_API_KEY) {
    throw new Error('Claude API kulcs nincs beállítva a Supabase Edge Function változók között');
  }
  
  try {
    const prompt = `
Elemezd a következő SAPS dokumentumot és nyerd ki belőle a gazdálkodó adatait.

SAPS dokumentum tartalma:
${documentText.substring(0, 25000)}

A FELADAT: A dokumentumból CSAK a következő információkat kell kinyerned:
1. A gazdálkodó (kérelmező) neve
2. A gazdálkodó (kérelmező) azonosítószáma (10 jegyű szám)
3. A beadó/benyújtó azonosítószáma (ha különbözik a kérelmezőétől)

KÖVETELMÉNYEK:
1. CSAK a fenti adatokat keresd, semmi mást!
2. Ha nem találod a pontos adatokat, akkor írd, hogy "ismeretlen" vagy "nem található"
3. NE TALÁLJ KI ADATOKAT! Csak a dokumentumban ténylegesen szereplő információkat használd!

Az adatokat a következő JSON formátumban add vissza:
{
  "applicantName": "A gazdálkodó neve vagy 'ismeretlen'",
  "documentId": "10 jegyű azonosító vagy 'ismeretlen'",
  "submitterId": "10 jegyű beadói azonosító vagy 'ismeretlen' (ha ugyanaz, mint a kérelmezőé, akkor is add meg)"
}

FIGYELEM! Csak a kért JSON formátumban válaszolj, más szöveg vagy magyarázat nélkül!
`;

    console.log("🤖 Claude API hívás előkészítése...");
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: "claude-3-opus-20240229",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Claude API hiba: ${response.status} ${response.statusText}`);
      console.error("Hibaüzenet:", errorText);
      throw new Error(`Claude API hiba: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    console.log("🤖 Claude API válasz:", JSON.stringify(result));
    
    if (result.content && result.content.length > 0) {
      const aiResponse = result.content[0].text;
      
      // Próbáljuk meg JSON-ként értelmezni a választ
      try {
        // Keressük meg az első JSON objektumot a válaszban
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const extractedJson = JSON.parse(jsonMatch[0]);
          
          // Ellenőrizzük, hogy a szükséges adatok megvannak-e
          if (!extractedJson.applicantName || extractedJson.applicantName === "ismeretlen") {
            console.warn("⚠️ A gazdálkodó neve nem található a dokumentumban");
          }
          
          if (!extractedJson.documentId || extractedJson.documentId === "ismeretlen") {
            console.warn("⚠️ A gazdálkodó azonosítószáma nem található a dokumentumban");
          }
          
          return {
            ...extractedJson,
            hectares: 0,
            cultures: [],
            blockIds: [],
            totalRevenue: 0,
            region: ""
          };
        } else {
          throw new Error("Nem sikerült JSON objektumot kinyerni a Claude válaszából");
        }
      } catch (jsonError) {
        console.error("JSON feldolgozási hiba:", jsonError);
        console.error("Eredeti AI válasz:", aiResponse);
        throw new Error("Nem sikerült értelmezni a Claude API válaszát: " + jsonError);
      }
    }
    
    throw new Error("Nem sikerült feldolgozni a Claude választ - hiányzó válasz tartalom");
    
  } catch (error) {
    console.error("Claude API hiba:", error);
    throw error;
  }
}
