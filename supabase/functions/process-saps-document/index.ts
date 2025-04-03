
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { OpenAI } from "https://deno.land/x/openai@v4.24.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create OpenAI client with Beta header for Assistants API
const openai = new OpenAI({
  apiKey: openaiApiKey,
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v2'
  }
});

// Upload file to OpenAI
async function uploadFileToOpenAI(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
  console.log("Uploading file to OpenAI:", fileName);
  
  const file = await openai.files.create({
    file: new File([fileBuffer], fileName),
    purpose: "assistants"
  });
  
  console.log("File uploaded successfully. File ID:", file.id);
  return file.id;
}

// Create Assistant
async function createAssistant(fileId: string): Promise<string> {
  console.log("Creating OpenAI Assistant with file:", fileId);
  
  const assistant = await openai.beta.assistants.create({
    name: "SAPS Dokumentum Elemző",
    instructions: `Te egy magyar mezőgazdasági SAPS dokumentum elemző szakértő vagy.
    A dokumentumból a következő adatokat kell precízen kinyerned JSON formátumban:
    
    {
      "applicantName": "A kérelmező teljes neve",
      "clientId": "Ügyfél-azonosító",
      "documentId": "Dokumentum azonosító",
      "year": "Gazdasági év",
      "hectares": "Teljes igényelt terület (számformátumban)",
      "cultures": [
        {
          "name": "Növénykultúra neve magyarul",
          "code": "Hasznosítási kód",
          "hectares": "Igényelt terület (számformátumban)"
        }
      ],
      "blockIds": ["Blokkazonosítók listája"]
    }`,
    tools: [{ type: "retrieval" }],
    file_ids: [fileId],
    model: "gpt-4o"
  });
  
  console.log("Assistant created successfully. Assistant ID:", assistant.id);
  return assistant.id;
}

// Create Thread and Add Message
async function createThreadAndAddMessage(assistantId: string, fileId: string): Promise<{ threadId: string, runId: string }> {
  console.log("Creating thread and adding message");
  
  const thread = await openai.beta.threads.create();
  
  await openai.beta.threads.messages.create(thread.id, {
    role: "user",
    content: `Elemezd ki részletesen a csatolt SAPS dokumentumot. 
    Kérem JSON formátumban add meg a dokumentum részleteit, 
    figyelve a magyar mezőgazdasági terminológiára és a pontos adatokra.`,
    file_ids: [fileId]
  });
  
  const run = await openai.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId
  });
  
  console.log("Thread created. Thread ID:", thread.id, "Run ID:", run.id);
  return { threadId: thread.id, runId: run.id };
}

// Check Run Status
async function checkRunStatus(threadId: string, runId: string): Promise<string> {
  const run = await openai.beta.threads.runs.retrieve(threadId, runId);
  return run.status;
}

// Wait for Run Completion
async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 30): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await checkRunStatus(threadId, runId);
    
    if (status === 'completed') {
      console.log("Run completed successfully");
      return;
    }
    
    if (['failed', 'cancelled', 'expired'].includes(status)) {
      throw new Error(`Run ended with status: ${status}`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  throw new Error(`Run did not complete after ${maxAttempts} checks`);
}

// Retrieve Thread Messages
async function retrieveThreadMessages(threadId: string): Promise<any> {
  const messages = await openai.beta.threads.messages.list(threadId);
  
  // Find the last assistant message
  const assistantMessages = messages.data.filter(msg => msg.role === 'assistant');
  
  if (assistantMessages.length === 0) {
    throw new Error("No assistant messages found");
  }
  
  const lastMessage = assistantMessages[0];
  const content = lastMessage.content[0] as { text: { value: string } };
  
  try {
    // Try to parse the message as JSON
    const jsonMatch = content.text.value.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      return JSON.parse(jsonMatch[1]);
    }
    
    return JSON.parse(content.text.value);
  } catch (error) {
    console.warn("Failed to parse message as JSON:", error);
    return { rawMessage: content.text.value };
  }
}

// Main document processing function
async function processDocumentWithOpenAI(fileBuffer: ArrayBuffer, fileName: string, userId: string): Promise<any> {
  try {
    console.log("Starting OpenAI document processing flow...");
    
    // 1. Upload file to OpenAI
    const fileId = await uploadFileToOpenAI(fileBuffer, fileName);
    
    // 2. Create Assistant
    const assistantId = await createAssistant(fileId);
    
    // 3. Create Thread and Add Message
    const { threadId, runId } = await createThreadAndAddMessage(assistantId, fileId);
    
    // 4. Wait for Run Completion
    await waitForRunCompletion(threadId, runId);
    
    // 5. Retrieve Thread Messages
    const extractedData = await retrieveThreadMessages(threadId);
    console.log("Extracted data:", extractedData);
    
    // 6. Calculate Revenue and Market Prices
    const processedData = await calculateRevenueAndMarketPrices(extractedData);
    
    // 7. Store Data in Supabase
    await storeProcessedData(userId, processedData);
    
    return processedData;
  } catch (error) {
    console.error("Error processing document with OpenAI:", error);
    throw error;
  }
}

// Calculate Revenue and Market Prices (similar to previous implementation)
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
    ...extractedData,
    cultures: culturesWithRevenue,
    totalRevenue,
    marketPrices: relevantMarketPrices,
    hectares,
    blockIds
  };
}

// Store Processed Data in Supabase
async function storeProcessedData(userId: string, farmData: any) {
  try {
    // Insert farm data
    const { data: farmRecord, error: farmError } = await supabase
      .from('farms')
      .insert({
        user_id: userId,
        document_id: farmData.documentId || 'UNKNOWN',
        hectares: farmData.hectares,
        total_revenue: farmData.totalRevenue,
        region: farmData.region || 'Magyarország',
        year: farmData.year || new Date().getFullYear().toString()
      })
      .select('id')
      .single();
    
    if (farmError) throw farmError;
    
    // Insert cultures
    for (const culture of farmData.cultures) {
      await supabase
        .from('cultures')
        .insert({
          farm_id: farmRecord.id,
          name: culture.name,
          hectares: culture.hectares,
          estimated_revenue: culture.estimatedRevenue
        });
    }
    
    // Store market prices and additional details
    await supabase
      .from('farm_details')
      .insert({
        farm_id: farmRecord.id,
        market_prices: farmData.marketPrices,
        block_ids: farmData.blockIds
      });
    
  } catch (error) {
    console.error("Error storing processed data:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Validate OpenAI API key
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key is not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate user authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Create Supabase client with user token
    const userToken = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } }
    });
    
    // Authenticate user
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(userToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process uploaded file
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Convert file to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    // Process document
    const farmData = await processDocumentWithOpenAI(fileBuffer, file.name, user.id);
    
    // Return processed data
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
