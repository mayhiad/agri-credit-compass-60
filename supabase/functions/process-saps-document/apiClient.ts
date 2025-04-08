
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
      console.error("❌ ANTHROPIC_API_KEY environment variable not set");
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
    
    console.log(`🚀 Sending Claude API request to ${CLAUDE_API_URL}, model: ${CLAUDE_MODEL}, with ${validImageUrls.length} images`);
    console.log(`🧾 Request payload summary: model=${payload.model}, images=${validImageUrls.length}`);
    
    // Enhanced retry logic for overloaded errors
    let retryCount = 0;
    const maxRetries = 5; // Increased from 3 to 5
    const baseDelay = 3000; // Increased from 2000ms to 3000ms initial delay
    const maxDelay = 30000; // Maximum delay of 30 seconds
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`🔄 API request attempt ${retryCount + 1}/${maxRetries + 1}`);
        
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
        console.log(`🔍 Claude API response status: ${response.status}`);
        
        // Check for HTML response which indicates an error
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('text/html')) {
          const htmlContent = await response.text();
          console.error('❌ Received HTML instead of JSON. This typically indicates a network error or proxy issue:');
          console.error(htmlContent.substring(0, 200) + '...'); // Log first 200 chars of HTML
          throw new Error('Received HTML instead of JSON response. Check network connectivity and proxy settings.');
        }
        
        // Check for overloaded error specifically
        if (response.status === 529) {
          const errorText = await response.text();
          console.warn(`⚠️ Claude API overloaded (attempt ${retryCount + 1}/${maxRetries + 1}): ${errorText}`);
          
          if (retryCount < maxRetries) {
            // Exponential backoff with jitter: baseDelay * (2^retryCount) + random jitter
            const exponentialDelay = baseDelay * Math.pow(2, retryCount);
            const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
            const delay = Math.min(exponentialDelay + jitter, maxDelay);
            
            console.log(`⏱️ Retrying in ${Math.round(delay / 1000)} seconds...`);
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
            console.log(`⏱️ Rate limited. Retrying in ${Math.round(delay / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
        }
        
        // Handle other error responses
        if (!response.ok) {
          let errorMessage = "";
          try {
            // First check if the response contains HTML (which would throw an error when parsing as JSON)
            const responseText = await response.text();
            if (responseText.trim().startsWith('<')) {
              errorMessage = `Claude API error: ${response.status} - Received HTML instead of JSON. Network issue detected.`;
              console.error(`❌ ${errorMessage}`);
              console.error(`HTML response preview: ${responseText.substring(0, 200)}...`);
            } else {
              // Try to parse as JSON if it's not HTML
              try {
                const errorJson = JSON.parse(responseText);
                errorMessage = `Claude API error: ${response.status} - ${errorJson.error?.message || JSON.stringify(errorJson)}`;
              } catch (parseError) {
                // If it's neither valid HTML nor JSON, just use the text
                errorMessage = `Claude API error: ${response.status} - ${responseText}`;
              }
              console.error(`❌ ${errorMessage}`);
            }
          } catch (textError) {
            // Fallback if we can't read the response at all
            errorMessage = `Claude API error: ${response.status} - Could not read response body`;
            console.error(`❌ ${errorMessage}`);
          }
          throw new Error(errorMessage);
        }
        
        // Try to parse the successful response
        try {
          let result;
          const responseText = await response.text();
          try {
            result = JSON.parse(responseText);
          } catch (jsonError) {
            // If response isn't valid JSON, log it and throw an error
            console.error(`❌ Failed to parse Claude API response as JSON: ${jsonError.message}`);
            console.error(`Response text (first 200 chars): ${responseText.substring(0, 200)}...`);
            throw new Error(`Response is not valid JSON: ${jsonError.message}`);
          }
          
          console.log(`✅ Claude API response received. Content type: ${result.content?.[0]?.type}, length: ${result.content?.[0]?.text?.length || 0} chars`);
          
          return result;
        } catch (parseError) {
          const parseErrorMsg = `Failed to parse Claude API response: ${parseError.message}`;
          console.error(`❌ ${parseErrorMsg}`);
          throw new Error(parseErrorMsg);
        }
      } catch (fetchError) {
        console.error(`❌ Network error during API request: ${fetchError.message}`);
        
        // Check if it's the HTML issue
        if (fetchError.message.includes('HTML instead of JSON')) {
          console.error('This may indicate network connectivity issues or a proxy server issue');
          if (retryCount < maxRetries) {
            const delay = baseDelay * Math.pow(2, retryCount);
            console.log(`⏱️ Network issue detected. Retrying in ${Math.round(delay / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            retryCount++;
            continue;
          }
        }
        
        // If it's any other error besides the retry logic, throw immediately
        if (retryCount >= maxRetries || 
            (!fetchError.message.includes("529") && !fetchError.message.includes("429") && 
             !fetchError.message.includes("HTML instead of JSON"))) {
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
