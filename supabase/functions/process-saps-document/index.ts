
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Feltölti a PDF-et az OpenAI API-nak
async function uploadFileToOpenAI(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
  console.log("Uploading file to OpenAI:", fileName);
  
  // Létrehozzunk egy FormData objektumot a fájl feltöltéséhez
  const formData = new FormData();
  formData.append('file', new File([fileBuffer], fileName, { type: 'application/pdf' }));
  formData.append('purpose', 'assistants');
  
  const response = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
    body: formData,
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI file upload error:", errorData);
    throw new Error(`OpenAI file upload error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log("File uploaded successfully. File ID:", data.id);
  return data.id;
}

// Létrehoz egy assistanst az OpenAI API-nál
async function createAssistant(fileId: string): Promise<string> {
  console.log("Creating OpenAI Assistant with file:", fileId);
  
  const response = await fetch('https://api.openai.com/v1/assistants', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: "SAPS Dokumentum Elemző",
      instructions: `Te egy magyar mezőgazdasági SAPS dokumentum elemző szakértő vagy.
      A dokumentumból a következő adatokat kell precízen kinyerned:
      
      1. Kérelmező neve (pl. "Martini Mihály")
      2. Ügyfél-azonosító száma (pl. "1002236474")
      3. Dokumentum azonosító (pl. "3283637334")
      4. Gazdasági év (pl. "2021")
      5. Teljes igényelt terület hektárban (pl. összesített igényelt terület)
      6. Az egyes növénykultúrák részletes adatai:
         - Pontos név (pl. "Őszi búza", "Napraforgó", "Kukorica")
         - Hasznosítási kód (pl. "KAL01", "IND23", "KAL21")
         - Igényelt terület hektárban (pl. "73.3880", "94.0400", "46.4700")
      7. A dokumentumban szereplő összes blokkazonosító (pl. "C1ADAT18", "C1XJUD18")
      
      Az eredményt strukturált formában, magyar nyelven, de precíz, tizedespontos számértékekkel add vissza.`,
      tools: [{ type: "retrieval" }],
      file_ids: [fileId],
      model: "gpt-4o",
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI assistant creation error:", errorData);
    throw new Error(`OpenAI assistant creation error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Assistant created successfully. Assistant ID:", data.id);
  return data.id;
}

// Létrehoz egy thread-et az OpenAI API-nál
async function createThread(): Promise<string> {
  console.log("Creating OpenAI Thread");
  
  const response = await fetch('https://api.openai.com/v1/threads', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI thread creation error:", errorData);
    throw new Error(`OpenAI thread creation error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Thread created successfully. Thread ID:", data.id);
  return data.id;
}

// Hozzáad egy üzenetet a thread-hez
async function addMessageToThread(threadId: string): Promise<void> {
  console.log("Adding message to thread:", threadId);
  
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role: "user",
      content: `Elemezd ki a SAPS dokumentumot és add vissza a következő adatokat JSON formátumban:
      {
        "applicantName": "A kérelmező teljes neve",
        "clientId": "Ügyfél-azonosító",
        "documentId": "Dokumentum azonosító",
        "year": "Gazdasági év",
        "hectares": teljes igényelt terület számformátumban,
        "cultures": [
          {
            "name": "Növénykultúra neve magyarul",
            "code": "Hasznosítási kód",
            "hectares": terület számformátumban
          },
          // ... további kultúrák
        ],
        "blockIds": ["Blokkazonosító1", "Blokkazonosító2", ... ]
      }`,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI message addition error:", errorData);
    throw new Error(`OpenAI message addition error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Message added successfully");
}

// Elindít egy run-t az OpenAI API-nál
async function createRun(threadId: string, assistantId: string): Promise<string> {
  console.log("Creating run with thread:", threadId, "and assistant:", assistantId);
  
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistant_id: assistantId,
    }),
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI run creation error:", errorData);
    throw new Error(`OpenAI run creation error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Run created successfully. Run ID:", data.id);
  return data.id;
}

// Ellenőrzi a run státuszát
async function checkRunStatus(threadId: string, runId: string): Promise<string> {
  console.log("Checking run status. Thread ID:", threadId, "Run ID:", runId);
  
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI run status check error:", errorData);
    throw new Error(`OpenAI run status check error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Run status:", data.status);
  return data.status;
}

// Lekéri a thread üzeneteit
async function getThreadMessages(threadId: string): Promise<any> {
  console.log("Getting thread messages. Thread ID:", threadId);
  
  const response = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
    },
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    console.error("OpenAI thread messages retrieval error:", errorData);
    throw new Error(`OpenAI thread messages retrieval error: ${errorData.error?.message || response.statusText}`);
  }
  
  const data = await response.json();
  console.log("Retrieved thread messages successfully");
  
  // Az asszisztens válaszát keressük
  const assistantMessages = data.data.filter((msg: any) => msg.role === 'assistant');
  if (assistantMessages.length === 0) {
    throw new Error("No assistant messages found in the thread");
  }
  
  // A legfrissebb üzenetet vesszük
  const lastMessage = assistantMessages[0];
  
  // Kinyerjük a szöveges tartalmat
  const messageContent = lastMessage.content[0].text.value;
  console.log("Assistant response:", messageContent);
  
  try {
    // Megpróbáljuk JSON-ként értelmezni az üzenetet
    // A JSON formátumú részt keressük
    const jsonMatch = messageContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // Ha nincs JSON kód blokk, akkor megpróbáljuk az egész üzenetet JSON-ként értelmezni
    return JSON.parse(messageContent);
  } catch (error) {
    console.warn("Failed to parse message as JSON:", error);
    console.log("Raw message content:", messageContent);
    
    // Ha nem sikerül JSON-ként értelmezni, visszaadjuk az üzenetet szövegként
    return { rawMessage: messageContent };
  }
}

// Vár amíg a run befejeződik
async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 30): Promise<void> {
  console.log("Waiting for run completion...");
  
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkRunStatus(threadId, runId);
    
    if (status === 'completed') {
      console.log("Run completed successfully");
      return;
    }
    
    if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      throw new Error(`Run ended with status: ${status}`);
    }
    
    // Várunk egy kicsit a következő ellenőrzés előtt
    console.log(`Run still in progress (${status}). Checking again in 2 seconds...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Run did not complete after ${maxAttempts} checks`);
}

// Feldolgozza a dokumentumot az OpenAI segítségével
async function processDocumentWithOpenAI(fileBuffer: ArrayBuffer, fileName: string): Promise<any> {
  try {
    console.log("Starting OpenAI document processing flow...");
    
    // 1. Feltöltjük a fájlt
    const fileId = await uploadFileToOpenAI(fileBuffer, fileName);
    
    // 2. Létrehozunk egy asszisztenst a fájllal
    const assistantId = await createAssistant(fileId);
    
    // 3. Létrehozunk egy thread-et
    const threadId = await createThread();
    
    // 4. Hozzáadunk egy üzenetet
    await addMessageToThread(threadId);
    
    // 5. Elindítunk egy run-t
    const runId = await createRun(threadId, assistantId);
    
    // 6. Várunk a run befejezésére
    await waitForRunCompletion(threadId, runId);
    
    // 7. Lekérjük a thread üzeneteit
    const extractedData = await getThreadMessages(threadId);
    console.log("Document processed successfully by OpenAI:", extractedData);
    
    return extractedData;
  } catch (error) {
    console.error("Error processing document with OpenAI:", error);
    throw error;
  }
}

// Piaci árak és növénykultúrák kalkulációja
async function calculateRevenueAndMarketPrices(extractedData: any): Promise<any> {
  console.log("Calculating revenue and market prices");
  
  // Alapértelmezett piaci árak és hozamok
  const defaultMarketPrices = [
    {
      culture: "Őszi búza",
      averageYield: 5.5,
      price: 85000,
      trend: 0,
      lastUpdated: new Date()
    },
    {
      culture: "Kukorica",
      averageYield: 8.0,
      price: 72000,
      trend: 1,
      lastUpdated: new Date()
    },
    {
      culture: "Napraforgó",
      averageYield: 3.1,
      price: 170000,
      trend: 0,
      lastUpdated: new Date()
    },
    {
      culture: "Őszi káposztarepce",
      averageYield: 3.3,
      price: 190000,
      trend: 1,
      lastUpdated: new Date()
    },
    {
      culture: "Őszi árpa",
      averageYield: 5.2,
      price: 70000,
      trend: -1,
      lastUpdated: new Date()
    },
    {
      culture: "Tavaszi árpa",
      averageYield: 4.8,
      price: 73000,
      trend: -1,
      lastUpdated: new Date()
    }
  ];
  
  // Ellenőrizzük, hogy a kapott adatok tartalmazzák-e a szükséges mezőket
  const cultures = Array.isArray(extractedData.cultures) ? extractedData.cultures : [];
  console.log(`Processing ${cultures.length} cultures`);
  
  // Kultúrák feldolgozása és bevétel számítás
  const culturesWithRevenue = cultures.map(culture => {
    // Ellenőrizzük és biztosítsuk az alapadatokat
    const cultureName = typeof culture.name === 'string' ? culture.name : 'Ismeretlen';
    const cultureHectares = typeof culture.hectares === 'number' && !isNaN(culture.hectares) ? 
      culture.hectares : parseFloat(culture.hectares) || 0;
    
    // Keresünk megfelelő piaci árat
    const marketPrice = defaultMarketPrices.find(mp => mp.culture === cultureName) || 
      defaultMarketPrices.find(mp => cultureName.includes(mp.culture)) || 
      { averageYield: 4.5, price: 80000 };
    
    const yieldPerHa = marketPrice.averageYield;
    const pricePerTon = marketPrice.price;
    
    // Bevétel számítása: terület * hozam * ár
    const estimatedRevenue = cultureHectares * yieldPerHa * pricePerTon;
    
    console.log(`Culture: ${cultureName}, Hectares: ${cultureHectares}, Yield: ${yieldPerHa} t/ha, Price: ${pricePerTon} Ft/t, Revenue: ${estimatedRevenue} Ft`);
    
    return {
      name: cultureName,
      hectares: cultureHectares,
      estimatedRevenue
    };
  });
  
  // Teljes bevétel számítása
  const totalRevenue = culturesWithRevenue.reduce((sum, culture) => sum + culture.estimatedRevenue, 0);
  console.log(`Calculated total revenue: ${totalRevenue} Ft`);
  
  // Kapcsolódó piaci adatok gyűjtése
  const relevantMarketPrices = cultures.map(culture => {
    const cultureName = typeof culture.name === 'string' ? culture.name : 'Ismeretlen';
    
    // Keresünk megfelelő piaci árat
    const marketPrice = defaultMarketPrices.find(mp => mp.culture === cultureName) || 
      defaultMarketPrices.find(mp => cultureName.includes(mp.culture)) || 
      { 
        culture: cultureName, 
        averageYield: 4.5, 
        price: 80000, 
        trend: 0, 
        lastUpdated: new Date() 
      };
    
    return {
      culture: cultureName,
      averageYield: marketPrice.averageYield,
      price: marketPrice.price,
      trend: marketPrice.trend,
      lastUpdated: marketPrice.lastUpdated
    };
  });
  
  // Alapértelmezett értékek a nem definiált mezőkhöz
  const hectares = typeof extractedData.hectares === 'number' && !isNaN(extractedData.hectares) ? 
    extractedData.hectares : parseFloat(extractedData.hectares) || 
    culturesWithRevenue.reduce((sum, culture) => sum + culture.hectares, 0);
  
  const blockIds = Array.isArray(extractedData.blockIds) ? extractedData.blockIds : [];
  
  return {
    cultures: culturesWithRevenue,
    totalRevenue,
    marketPrices: relevantMarketPrices,
    hectares,
    blockIds
  };
}

// Fő feldolgozó függvény
async function processDocument(fileBuffer: ArrayBuffer, fileName: string, userId: string): Promise<any> {
  try {
    console.log("Starting document processing for user:", userId);
    
    // OpenAI segítségével feldolgozzuk a dokumentumot
    const extractedData = await processDocumentWithOpenAI(fileBuffer, fileName);
    console.log("Extracted data from OpenAI:", extractedData);
    
    // Kiszámoljuk a bevételt és piaci árakat
    const { cultures, totalRevenue, marketPrices, hectares, blockIds } = 
      await calculateRevenueAndMarketPrices(extractedData);
    
    // Összeállítjuk a farm adatokat
    const farmData = {
      hectares: hectares,
      cultures: cultures,
      totalRevenue: totalRevenue,
      region: "Magyarország",
      documentId: extractedData.documentId || fileName,
      applicantName: extractedData.applicantName || "Felhasználó",
      blockIds: blockIds,
      marketPrices: marketPrices,
      year: extractedData.year || new Date().getFullYear().toString()
    };
    
    console.log("FarmData assembled:", farmData);
    
    // Adatok mentése Supabase-be
    try {
      const { data: farmRecord, error: farmError } = await supabase
        .from('farms')
        .insert({
          user_id: userId,
          document_id: farmData.documentId,
          hectares: farmData.hectares,
          total_revenue: farmData.totalRevenue,
          region: farmData.region,
          year: farmData.year
        })
        .select('id')
        .single();
      
      if (farmError) {
        console.error("Error storing farm data:", farmError);
      } else {
        console.log("Farm data stored with ID:", farmRecord.id);
        
        // Kultúrák mentése
        for (const culture of farmData.cultures) {
          const { error: cultureError } = await supabase
            .from('cultures')
            .insert({
              farm_id: farmRecord.id,
              name: culture.name,
              hectares: culture.hectares,
              estimated_revenue: culture.estimatedRevenue
            });
          
          if (cultureError) {
            console.error("Error storing culture data:", cultureError, culture);
          }
        }
        
        // Piaci árak mentése
        const { error: detailsError } = await supabase
          .from('farm_details')
          .insert({
            farm_id: farmRecord.id,
            market_prices: farmData.marketPrices
          });
        
        if (detailsError) {
          console.error("Error storing farm details:", detailsError);
        }
      }
    } catch (dbError) {
      console.error("Database operation failed:", dbError);
      // Adatbázis hiba nem állítja le a folyamatot, még visszaadjuk az adatokat
    }
    
    return farmData;
  } catch (error) {
    console.error("Error processing document:", error);
    throw new Error(`Document processing failed: ${error.message}`);
  }
}

serve(async (req) => {
  // CORS kérések kezelése
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Ellenőrizzük az API kulcsot
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not set in environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Ellenőrizzük az authorization header-t
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Létrehozunk egy Supabase klienst a JWT token alapján
    const userToken = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } }
    });
    
    // Lekérjük a felhasználói adatokat
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(userToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userId = user.id;
    console.log("Processing document for user:", userId);
    
    // Feldolgozzuk a kérést
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Fájlt ArrayBuffer-ré alakítjuk
    const fileBuffer = await file.arrayBuffer();
    
    // Feldolgozzuk a dokumentumot
    const farmData = await processDocument(fileBuffer, file.name, userId);
    
    // Visszaadjuk a feldolgozott adatokat
    return new Response(
      JSON.stringify(farmData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error in process-saps-document function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
