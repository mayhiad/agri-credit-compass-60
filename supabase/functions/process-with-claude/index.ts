
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { corsHeaders } from "../process-saps-document/cors.ts";
import * as pdf from "https://deno.land/x/pdfjs@v0.1.2/mod.ts";

const API_TIMEOUT = 180000; // 3 perc

serve(async (req) => {
  // CORS kezelése
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    console.log("📥 Claude AI feldolgozás indítása");
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) throw new Error('Nem érkezett fájl');
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
    
    console.log(`📝 Dokumentum szövege kinyerve, hossza: ${fileText.length} karakter`);
    
    // Claude API hívás a szöveg feldolgozásához
    const extractedData = await processWithClaudeAPI(fileText);
    
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
      return "PDF feldolgozási hiba: " + (error instanceof Error ? error.message : String(error));
    }
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    // Excel esetén egyszerű üzenet
    return "Excel dokumentum, részletes szöveges tartalom nem áll rendelkezésre.";
  } else {
    // Egyéb formátumok
    try {
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(fileBuffer);
    } catch (error) {
      console.error("Szöveg dekódolási hiba:", error);
      return "Szöveg dekódolási hiba: " + (error instanceof Error ? error.message : String(error));
    }
  }
}

// Claude API hívás a szövegfeldolgozáshoz
async function processWithClaudeAPI(documentText: string) {
  const CLAUDE_API_KEY = Deno.env.get('CLAUDE_API_KEY');
  
  if (!CLAUDE_API_KEY) {
    throw new Error('Claude API kulcs nincs beállítva');
  }
  
  try {
    const prompt = `
Elemezd a következő SAPS dokumentumot és nyerd ki belőle a gazdálkodó adatait.

SAPS dokumentum tartalma:
${documentText.substring(0, 15000)}

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
        model: "claude-3-haiku-20240307",
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
          return {
            ...extractedJson,
            hectares: 0,
            cultures: [],
            blockIds: [],
            totalRevenue: 0,
            region: ""
          };
        }
      } catch (jsonError) {
        console.error("JSON feldolgozási hiba:", jsonError);
      }
      
      // Ha nem sikerült JSON-ként értelmezni, adjunk vissza egy alap objektumot
      return {
        applicantName: "Ismeretlen gazdálkodó",
        documentId: "0000000000",
        submitterId: "0000000000",
        hectares: 0,
        cultures: [],
        blockIds: [],
        totalRevenue: 0,
        region: ""
      };
    }
    
    throw new Error("Nem sikerült feldolgozni a Claude választ");
    
  } catch (error) {
    console.error("Claude API hiba:", error);
    throw error;
  }
}
