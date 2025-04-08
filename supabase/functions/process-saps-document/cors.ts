
// CORS headers for cross-origin requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Handle OPTIONS preflight requests
export function handleCors(req: Request): Response | null {
  // Log the request method and headers for debugging
  console.log(`📝 Preflight check: ${req.method} request received`);
  console.log("📝 Request headers:", JSON.stringify(Object.fromEntries([...new Headers(req.headers)])));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("⚙️ Processing CORS preflight request");
    
    // Respond with success and appropriate CORS headers
    return new Response(null, {
      status: 204, // No content
      headers: {
        ...corsHeaders,
        // Add a custom header for debugging
        'X-Debug-Info': 'CORS preflight processed successfully'
      },
    });
  }
  
  // For test-only requests that aren't full document processing
  if (req.method === 'POST') {
    const url = new URL(req.url);
    if (url.searchParams.get('test') === 'true') {
      console.log("🧪 Processing test-only request");
      return new Response(JSON.stringify({ success: true, message: "API endpoint is accessible" }), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
  }
  
  // Return null for normal requests to continue processing
  return null;
}
