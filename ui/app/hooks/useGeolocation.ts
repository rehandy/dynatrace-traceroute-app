import { GeoLocation } from '../types/traceroute';

/**
 * Hook to fetch geolocation data for an IP address using App Function
 */
export function useGeolocation() {
  /**
   * Fetches geolocation data for a single IP address
   */
  const fetchGeoLocation = async (ip: string): Promise<GeoLocation | null> => {
    try {
      // Skip private/local IPs
      if (isPrivateIP(ip)) {
        console.log(`[FRONTEND] Skipping private IP: ${ip}`);
        return null;
      }

      console.log(`[FRONTEND] ==================== GEOLOCATION REQUEST START ====================`);
      console.log(`[FRONTEND] Fetching geolocation for: ${ip}`);
      console.log(`[FRONTEND] Current window.location:`, {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname
      });

      // Use relative path for both local dev and deployed environments
      // In local dev, functions are at /api/function-name
      // In deployed, they're at /api/function-name (relative to app root)
      const endpoint = '/api/geolocation';
      const payload = { ip };

      console.log(`[FRONTEND] Calling endpoint: ${endpoint}`);
      console.log(`[FRONTEND] Full URL will be: ${window.location.origin}${endpoint}`);
      console.log(`[FRONTEND] Payload:`, JSON.stringify(payload));
      console.log(`[FRONTEND] Request method: POST`);
      console.log(`[FRONTEND] Request headers:`, { 'Content-Type': 'application/json' });

      // Call the geolocation App Function via fetch
      // Using direct fetch as useAppFunction requires hook-based call pattern
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log(`[FRONTEND] -------------------- RESPONSE RECEIVED --------------------`);
      console.log(`[FRONTEND] Response status: ${response.status} ${response.statusText}`);
      console.log(`[FRONTEND] Response type: ${response.type}`);
      console.log(`[FRONTEND] Response redirected: ${response.redirected}`);
      console.log(`[FRONTEND] Response URL: ${response.url}`);
      console.log(`[FRONTEND] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FRONTEND] ==================== ERROR RESPONSE ====================`);
        console.error(`[FRONTEND] Error status: ${response.status}`);
        console.error(`[FRONTEND] Error status text: ${response.statusText}`);
        console.error(`[FRONTEND] Error response body:`, errorText);
        console.error(`[FRONTEND] Error response length:`, errorText.length);
        console.error(`[FRONTEND] Geolocation API returned ${response.status} for ${ip}`);
        console.error(`[FRONTEND] ============================================================`);
        return null;
      }

      const result = await response.json();
      console.log(`[FRONTEND] -------------------- PARSING RESPONSE --------------------`);
      console.log(`[FRONTEND] Response data:`, JSON.stringify(result));
      console.log(`[FRONTEND] Response data type:`, typeof result);
      console.log(`[FRONTEND] Response data keys:`, Object.keys(result));

      if (result.success && result.data) {
        console.log(`[FRONTEND] ==================== SUCCESS ====================`);
        console.log(`[FRONTEND] Success! Got location data for ${ip}`);
        console.log(`[FRONTEND] Location data:`, result.data);
        console.log(`[FRONTEND] ========================================================`);
        return result.data as GeoLocation;
      } else {
        console.error(`[FRONTEND] ==================== FAILED ====================`);
        console.error(`[FRONTEND] Geolocation failed for ${ip}:`, result.error);
        console.error(`[FRONTEND] Result success flag:`, result.success);
        console.error(`[FRONTEND] ========================================================`);
        return null;
      }
    } catch (error) {
      console.error(`[FRONTEND] ==================== EXCEPTION ====================`);
      console.error(`[FRONTEND] Exception while fetching geolocation for ${ip}:`, error);
      console.error(`[FRONTEND] Error name:`, (error as Error).name);
      console.error(`[FRONTEND] Error message:`, (error as Error).message);
      console.error(`[FRONTEND] Error stack:`, (error as Error).stack);
      console.error(`[FRONTEND] ========================================================`);
      return null;
    }
  };

  /**
   * Batch fetch geolocation data with rate limiting
   */
  const fetchGeoLocationBatch = async (ips: string[]): Promise<Map<string, GeoLocation | null>> => {
    const results = new Map<string, GeoLocation | null>();
    const publicIPs = ips.filter(ip => !isPrivateIP(ip));
    const delayMs = 500;

    console.log(`Processing ${publicIPs.length} public IPs with ${delayMs}ms delay between requests`);

    for (let i = 0; i < publicIPs.length; i++) {
      const ip = publicIPs[i];
      const location = await fetchGeoLocation(ip);
      results.set(ip, location);

      // Add delay between requests
      if (i < publicIPs.length - 1) {
        await delay(delayMs);
      }
    }

    console.log(`Geolocation lookup complete. Got ${results.size} results (${Array.from(results.values()).filter(v => v !== null).length} successful)`);
    return results;
  };

  return {
    fetchGeoLocation,
    fetchGeoLocationBatch
  };
}

/**
 * Checks if an IP address is private/local
 */
function isPrivateIP(ip: string): boolean {
  if (!ip || ip === '*') return true;

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return true;

  // Check for private IP ranges
  if (parts[0] === 10) return true; // 10.0.0.0/8
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true; // 172.16.0.0/12
  if (parts[0] === 192 && parts[1] === 168) return true; // 192.168.0.0/16
  if (parts[0] === 127) return true; // 127.0.0.0/8 (localhost)
  if (parts[0] === 169 && parts[1] === 254) return true; // 169.254.0.0/16 (link-local)

  return false;
}

/**
 * Utility function to add delay
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
