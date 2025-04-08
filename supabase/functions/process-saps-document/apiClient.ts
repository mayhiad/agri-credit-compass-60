// Claude API client
import { CLAUDE_API_URL, CLAUDE_MODEL } from "./utils.ts";

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
      system: "You are an assistant specialized in analyzing agricultural SAPS documents. Read the provided documents carefully to extract specific information as instructed. Be meticulous in identifying all the required data points including applicant information, block IDs with their sizes, historical crop data, and current year crop data. Follow the instructions carefully to extract data in the specified JSON format. If certain information cannot be found, leave the corresponding fields empty - do not make up data.",
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
    
    // Retry logic for overloaded errors
    let retryCount = 0;
    const maxRetries = 3;
    const baseDelay = 2000; // 2 seconds initial delay
    
    while (retryCount <= maxRetries) {
      try {
        const response = await fetch(CLAUDE_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify(payload)
        });
        
        // Check for overloaded error specifically
        if (response.status === 529) {
          const errorText = await response.text();
          console.warn(`⚠️ Claude API overloaded (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorText}`);
          
          if (retryCount < maxRetries) {
            // Exponential backoff: 2s, 4s, 8s
            const delay = baseDelay * Math.pow(2, retryCount);
            console.log(`🔄 Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
        }
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Claude API error: ${response.status} - ${errorText}`);
          
          // Try to extract more meaningful error information
          try {
            const errorJson = JSON.parse(errorText);
            const errorMessage = errorJson.error?.message || errorJson.error || errorText;
            throw new Error(`Claude API error: ${response.status} - ${errorMessage}`);
          } catch (parseError) {
            throw new Error(`Claude API error: ${response.status} - ${errorText}`);
          }
        }
        
        const result = await response.json();
        console.log(`✅ Claude API response received. Content type: ${result.content?.[0]?.type}, length: ${result.content?.[0]?.text?.length || 0} chars`);
        
        return result;
      } catch (fetchError) {
        // If it's any other error besides the retry logic, throw immediately
        if (retryCount >= maxRetries || !fetchError.message.includes("529")) {
          throw fetchError;
        }
        
        // Otherwise, we'll retry on the next iteration
        retryCount++;
      }
    }
    
    // If we've exhausted all retries
    throw new Error("Claude API is currently overloaded. Maximum retry attempts exceeded.");
  } catch (error) {
    console.error(`❌ Claude API request error: ${error.message}`);
    throw error;
  }
}
