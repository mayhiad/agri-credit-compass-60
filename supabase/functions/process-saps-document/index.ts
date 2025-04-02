
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

async function extractTextFromPdf(pdfBuffer: ArrayBuffer): Promise<string> {
  // In a real implementation, we would use a PDF parsing library like pdf.js
  // But since we can't easily import that in Deno, we'll simulate the extraction
  console.log("Extracting text from PDF...");
  
  // For demo purposes, we're assuming text has been extracted
  return "Sample extracted text from SAPS document";
}

async function processDocument(fileBuffer: ArrayBuffer, fileName: string, userId: string): Promise<any> {
  try {
    console.log("Processing document:", fileName);
    
    // Extract text from PDF
    const extractedText = await extractTextFromPdf(fileBuffer);
    console.log("Text extracted successfully");
    
    // Use OpenAI to analyze the extracted text
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an expert in analyzing Hungarian SAPS (Single Area Payment Scheme) agricultural documents. 
            Extract the following information in a structured way:
            - Applicant name
            - Total hectares
            - List of cultures (crops) with their respective areas in hectares
            - Block IDs
            - Parcel details (including block ID, parcel ID, culture, hectares, and location)
            - Region
            
            Return the data in a clean JSON format with the keys: applicantName, hectares, cultures (array of objects with name and hectares), 
            blockIds (array of strings), parcels (array of objects), and region.`
          },
          {
            role: "user",
            content: extractedText
          }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const aiResult = await response.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);
    console.log("AI analysis completed");

    // Fetch current market prices data (this could be from another API or database)
    const marketPrices = [
      {
        culture: "Búza",
        averageYield: 5.2,
        price: 85000,
        trend: 0,
        lastUpdated: new Date()
      },
      {
        culture: "Kukorica",
        averageYield: 7.8,
        price: 72000,
        trend: 1,
        lastUpdated: new Date()
      },
      {
        culture: "Napraforgó",
        averageYield: 2.9,
        price: 170000,
        trend: 0,
        lastUpdated: new Date()
      },
      {
        culture: "Repce",
        averageYield: 3.1,
        price: 190000,
        trend: 1,
        lastUpdated: new Date()
      },
      {
        culture: "Árpa",
        averageYield: 4.8,
        price: 70000,
        trend: -1,
        lastUpdated: new Date()
      }
    ];

    // Calculate estimated revenue based on extracted cultures and market prices
    const culturesWithRevenue = extractedData.cultures.map(culture => {
      const marketPrice = marketPrices.find(mp => mp.culture === culture.name);
      let estimatedRevenue = 0;
      
      if (marketPrice) {
        estimatedRevenue = culture.hectares * marketPrice.averageYield * marketPrice.price;
      } else {
        // Default estimation if market price not found
        estimatedRevenue = culture.hectares * 500000;
      }
      
      return {
        ...culture,
        estimatedRevenue
      };
    });

    // Calculate total revenue
    const totalRevenue = culturesWithRevenue.reduce(
      (sum, culture) => sum + culture.estimatedRevenue, 
      0
    );

    // Prepare final farm data
    const farmData = {
      hectares: extractedData.hectares,
      cultures: culturesWithRevenue,
      totalRevenue,
      region: extractedData.region,
      documentId: fileName,
      applicantName: extractedData.applicantName,
      blockIds: extractedData.blockIds,
      parcels: extractedData.parcels,
      marketPrices
    };

    // Store the farm data in Supabase
    const { data: farmRecord, error: farmError } = await supabase
      .from('farms')
      .insert({
        user_id: userId,
        document_id: fileName,
        hectares: farmData.hectares,
        total_revenue: farmData.totalRevenue,
        region: farmData.region
      })
      .select('id')
      .single();

    if (farmError) {
      console.error("Error storing farm data:", farmError);
      throw new Error(`Error storing farm data: ${farmError.message}`);
    }

    // Store cultures data
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
        console.error("Error storing culture data:", cultureError);
      }
    }

    // Store additional farm details
    const { error: detailsError } = await supabase
      .from('farm_details')
      .insert({
        farm_id: farmRecord.id,
        market_prices: marketPrices,
        location_data: extractedData.parcels.map(p => p.location)
      });

    if (detailsError) {
      console.error("Error storing farm details:", detailsError);
    }

    return farmData;
  } catch (error) {
    console.error("Error processing document:", error);
    throw new Error(`Document processing failed: ${error.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create a Supabase client using the user's JWT from the Authorization header
    const userToken = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${userToken}` } }
    });

    // Get user ID from token
    const { data: { user }, error: userError } = await userSupabase.auth.getUser(userToken);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    console.log("Processing document for user:", userId);

    // Process the request body
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
    
    // Process the document
    const farmData = await processDocument(fileBuffer, file.name, userId);
    
    // Return the processed data
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
