
import { supabase } from "@/integrations/supabase/client";
import { FarmData } from "@/types/farm";

/**
 * Checks processing results for a thread/run
 */
export const fetchProcessingResults = async (threadId?: string, runId?: string, ocrLogId?: string): Promise<{ 
  completed: boolean;
  status: string;
  data?: FarmData;
  rawContent?: string;
}> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error("No valid user session");
    }
    
    // If no threadId and runId, no need to check
    if (!threadId || !runId) {
      return { completed: true, status: 'completed' };
    }
    
    console.warn("get-thread-results function has been deprecated. This method will always return a completed status.");
    
    return {
      completed: true,
      status: 'completed',
      data: undefined,
      rawContent: undefined
    };
  } catch (error) {
    console.error("Processing results check error:", error);
    return { completed: false, status: 'error' };
  }
};
