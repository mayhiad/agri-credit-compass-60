
// API kérési timeout ms-ben (3 perc)
export const API_TIMEOUT = 180000;

// Timeout-os fetch implementáció
export async function fetchWithTimeout(url: string, options: RequestInit, timeout: number = API_TIMEOUT) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`API kérés időtúllépés. Az időkorlát ${timeout/1000} másodperc volt.`);
    }
    throw error;
  }
}
