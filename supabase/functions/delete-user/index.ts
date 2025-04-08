
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
    console.log(`Looking for user with email: ${email}`);
    const { data: userData, error: getUserError } = await supabase.auth.admin.listUsers();
    
    if (getUserError) {
      throw new Error(`Error fetching users: ${getUserError.message}`);
    }

    // Find the user with the matching email
    const user = userData.users.find(u => u.email === email);
    
    if (!user) {
      throw new Error(`User with email ${email} not found`);
    }

    console.log(`Found user with ID: ${user.id}`);

    // Delete the user's data from various tables if they exist
    console.log("Cleaning up user data...");
    
    // Delete farm data (and cascading to cultures, farm_details, etc.)
    const { error: farmsError } = await supabase
      .from('farms')
      .delete()
      .eq('user_id', user.id);
    
    if (farmsError) {
      console.error(`Error deleting farm data: ${farmsError.message}`);
      // Continue with deletion even if this fails
    }
    
    // Delete loans
    const { error: loansError } = await supabase
      .from('loans')
      .delete()
      .eq('user_id', user.id);
    
    if (loansError) {
      console.error(`Error deleting loans: ${loansError.message}`);
      // Continue with deletion even if this fails
    }
    
    // Delete user roles
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', user.id);
    
    if (rolesError) {
      console.error(`Error deleting user roles: ${rolesError.message}`);
      // Continue with deletion even if this fails
    }
    
    // Delete profile
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);
    
    if (profileError) {
      console.error(`Error deleting profile: ${profileError.message}`);
      // Continue with deletion even if this fails
    }

    // Finally, delete the user from auth
    console.log(`Deleting user with ID: ${user.id}`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      throw new Error(`Error deleting user: ${deleteError.message}`);
    }

    console.log(`Successfully deleted user with email: ${email}`);
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
