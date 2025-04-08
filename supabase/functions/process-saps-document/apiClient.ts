
// Claude API client
import { CLAUDE_API_URL, CLAUDE_MODEL, isImageFormatSupported } from "./utils.ts";

/**
 * Sends a request to the Claude API
 */
export async function sendClaudeRequest(
  messageContent: any[],
  validImageUrls: string[]
) {
  try {
    const claudeApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    
    if (!claudeApiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable not set");
    }
    
    // Construct Claude API request
    const payload = {
      model: CLAUDE_MODEL,
      max_tokens: 4000,
      temperature: 0,
      system: "You are an assistant specialized in analyzing agricultural SAPS documents. Read the provided documents carefully to extract specific information as instructed. Be meticulous in identifying all the required data points including applicant information, block IDs with their sizes, historical crop data, and current year crop data. Follow the instructions carefully to extract data in both structured text format AND the specified JSON format. If certain information cannot be found, leave the corresponding fields empty - do not make up data.",
      messages: [
        {
          role: "user",
          content: messageContent
        }
      ]
    };
    
    console.log(`🚀 Sending Claude API request: ${CLAUDE_API_URL}, model: ${CLAUDE_MODEL}, with ${validImageUrls.length} images`);
    
    // Log a sample of the request for debugging
    console.log(`Request summary: model=${payload.model}, images=${validImageUrls.length}, prompt size=${typeof messageContent[0] === 'object' && messageContent[0].text ? messageContent[0].text.length : 'unknown'} chars`);
    
    // Enhanced retry logic for overloaded errors
    let retryCount = 0;
    const maxRetries = 5; // Increased from 3 to 5
    const baseDelay = 3000; // Increased from 2000ms to 3000ms initial delay
    const maxDelay = 30000; // Maximum delay of 30 seconds
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`API request attempt ${retryCount + 1}/${maxRetries + 1}`);
        
        const response = await fetch(CLAUDE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01",
            "Connection": "keep-alive"
          },
          body: JSON.stringify(payload)
        });
        
        // Log response status
        console.log(`Claude API response status: ${response.status}`);
        
        // Check for overloaded error specifically
        if (response.status === 529) {
          const errorText = await response.text();
          console.warn(`⚠️ Claude API overloaded (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorText}`);
          
          if (retryCount < maxRetries) {
            // Exponential backoff with jitter: baseDelay * (2^retryCount) + random jitter
            const exponentialDelay = baseDelay * Math.pow(2, retryCount);
            const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
            const delay = Math.min(exponentialDelay + jitter, maxDelay);
            
            console.log(`🔄 Retrying in ${Math.round(delay / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
        }
        
        // Handle rate limit errors (429)
        if (response.status === 429) {
          const errorText = await response.text();
          console.warn(`⚠️ Claude API rate limited (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorText}`);
          
          if (retryCount < maxRetries) {
            // For rate limits, use a longer delay
            const delay = baseDelay * Math.pow(2, retryCount + 1); // More aggressive backoff
            console.log(`🔄 Rate limited. Retrying in ${Math.round(delay / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
        }
        
        // Handle other error responses
        if (!response.ok) {
          try {
            // Try to parse error response as JSON first
            const errorJson = await response.json();
            console.error(`❌ Claude API error: ${response.status} - ${JSON.stringify(errorJson)}`);
            throw new Error(`Claude API error: ${response.status} - ${errorJson.error?.message || JSON.stringify(errorJson)}`);
          } catch (jsonError) {
            // Fallback to text if not JSON
            const errorText = await response.text();
            console.error(`❌ Claude API error: ${response.status} - ${errorText}`);
            throw new Error(`Claude API error: ${response.status} - ${errorText}`);
          }
        }
        
        // Try to parse the successful response
        try {
          const result = await response.json();
          console.log(`✅ Claude API response received. Content type: ${result.content?.[0]?.type}, length: ${result.content?.[0]?.text?.length || 0} chars`);
          
          return result;
        } catch (parseError) {
          console.error(`❌ Failed to parse Claude API response: ${parseError.message}`);
          throw new Error(`Failed to parse Claude API response: ${parseError.message}`);
        }
      } catch (fetchError) {
        console.error(`❌ Network error during API request: ${fetchError.message}`);
        
        // If it's any other error besides the retry logic, throw immediately
        if (retryCount >= maxRetries || 
            (!fetchError.message.includes("529") && !fetchError.message.includes("429"))) {
          throw fetchError;
        }
        
        // Otherwise, we'll retry on the next iteration
        retryCount++;
      }
    }
    
    // If we've exhausted all retries
    throw new Error(`Claude API is currently overloaded or rate limited. Maximum retry attempts (${maxRetries}) exceeded.`);
  } catch (error) {
    console.error(`❌ Claude API request error: ${error.message}`);
    throw error;
  }
}
