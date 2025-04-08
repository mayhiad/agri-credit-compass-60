
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Admin key
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { email } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    // First, get the user by email
    const { data: users, error: getUserError } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", email)
      .single();

    if (getUserError) {
      throw new Error(`Error fetching user: ${getUserError.message}`);
    }

    if (!users) {
      throw new Error(`User with email ${email} not found`);
    }

    // Delete the user
    const { error: deleteError } = await supabase.auth.admin.deleteUser(users.id);
    
    if (deleteError) {
      throw new Error(`Error deleting user: ${deleteError.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: `User with email ${email} has been deleted` }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        headers: { "Content-Type": "application/json", ...corsHeaders },
        status: 400,
      }
    );
  }
});
