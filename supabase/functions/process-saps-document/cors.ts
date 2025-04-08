
// CORS headers for cross-origin requests
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

// Handle OPTIONS preflight requests
export function handleCors(req: Request): Response | null {
  // Log the request headers for debugging
  console.log("📝 Request headers:", JSON.stringify(Object.fromEntries([...new Headers(req.headers)])));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("⚙️ Processing CORS preflight request");
    return new Response(null, {
      status: 204, // No content
      headers: corsHeaders,
    });
  }
  
  // Return null for normal requests
  return null;
}
