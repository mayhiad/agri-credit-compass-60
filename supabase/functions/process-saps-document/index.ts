
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
  console.log("Extracting text from PDF...");
  
  // For production, use a proper PDF parsing library
  // Here we'll simulate text extraction
  return "Sample SAPS document text with agricultural details";
}

async function processDocument(fileBuffer: ArrayBuffer, fileName: string, userId: string): Promise<any> {
  try {
    const extractedText = await extractTextFromPdf(fileBuffer);
    console.log("Text extracted successfully");
    
    // Enhanced OpenAI prompt for more precise SAPS document parsing
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
            Extract the following structured information with high precision:
            1. Exact applicant name
            2. Total agricultural area in hectares
            3. Detailed breakdown of crop types and their specific areas
            4. Complete list of block IDs
            5. Parcel details including exact location, block ID, parcel ID, crop type, and area
            6. Agricultural region
            
            Return data in a strict, clean JSON format with validated and cross-referenced information.`
          },
          {
            role: "user",
            content: extractedText
          }
        ],
        temperature: 0.1, // Lower temperature for more consistent results
        response_format: { type: "json_object" } // Ensure structured JSON response
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const aiResult = await response.json();
    const extractedData = JSON.parse(aiResult.choices[0].message.content);
    console.log("Detailed AI analysis completed");

    // Default values for required fields to prevent undefined errors
    const defaultData = {
      applicantName: "Felhasználó",
      hectares: 0,
      cultures: [],
      region: "Ismeretlen régió",
      blockIds: [],
      parcels: []
    };

    // Merge extracted data with defaults to ensure all required fields exist
    const safeExtractedData = { ...defaultData, ...extractedData };

    // Enhanced data processing and revenue calculation
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

    // Ensure cultures is an array before mapping
    const cultures = Array.isArray(safeExtractedData.cultures) ? safeExtractedData.cultures : [];
    
    const culturesWithRevenue = cultures.map(culture => {
      const marketPrice = marketPrices.find(mp => mp.culture === culture.name);
      const estimatedRevenue = marketPrice 
        ? culture.hectares * marketPrice.averageYield * marketPrice.price
        : culture.hectares * 500000;
      
      return {
        ...culture,
        estimatedRevenue
      };
    });

    const totalRevenue = culturesWithRevenue.reduce(
      (sum, culture) => sum + culture.estimatedRevenue, 
      0
    );

    // Ensure blockIds and parcels are arrays
    const blockIds = Array.isArray(safeExtractedData.blockIds) ? safeExtractedData.blockIds : [];
    const parcels = Array.isArray(safeExtractedData.parcels) ? safeExtractedData.parcels : [];

    const farmData = {
      hectares: safeExtractedData.hectares,
      cultures: culturesWithRevenue,
      totalRevenue,
      region: safeExtractedData.region,
      documentId: fileName,
      applicantName: safeExtractedData.applicantName,
      blockIds,
      parcels,
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

    // Store additional farm details with safe location data
    const locationData = Array.isArray(parcels) && parcels.length > 0 
      ? parcels.map(p => p.location || {})
      : [];

    const { error: detailsError } = await supabase
      .from('farm_details')
      .insert({
        farm_id: farmRecord.id,
        market_prices: marketPrices,
        location_data: locationData
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
