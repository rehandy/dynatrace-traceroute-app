/**
 * App Function for IP Geolocation Lookup
 * Proxies requests to external geolocation APIs to avoid CSP restrictions
 */

export default async function (payload: unknown = undefined) {
  console.log('[GEOLOCATION FUNCTION] ========== FUNCTION INVOKED ==========');
  console.log('[GEOLOCATION FUNCTION] Received payload:', JSON.stringify(payload));

  try {
    const { ip } = payload as { ip: string };
    console.log('[GEOLOCATION FUNCTION] Extracted IP:', ip);

    // Skip private/local IPs
    if (isPrivateIP(ip)) {
      console.log('[GEOLOCATION FUNCTION] Skipping private IP:', ip);
      return { success: false, error: 'Private IP address' };
    }

    // Try primary API (IP2Location.io - 1000 free queries/day)
    console.log('[GEOLOCATION FUNCTION] Attempting IP2Location.io...');
    try {
      const response = await fetch(`https://api.ip2location.io/?ip=${ip}`);
      console.log('[GEOLOCATION FUNCTION] IP2Location.io response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('[GEOLOCATION FUNCTION] IP2Location.io response data:', JSON.stringify(data));
        if (!data.error && data.country_code) {
          console.log('[GEOLOCATION FUNCTION] IP2Location.io success!');
          return {
            success: true,
            data: {
              lat: data.latitude,
              lon: data.longitude,
              city: data.city_name || 'Unknown',
              region: data.region_name || 'Unknown',
              country: data.country_name || 'Unknown',
              countryCode: data.country_code || 'XX',
              isp: data.isp || 'Unknown ISP',
              org: data.as || 'Unknown',
              as: data.asn || 'Unknown',
              query: ip
            }
          };
        }
      }
    } catch (e) {
      console.log('[GEOLOCATION FUNCTION] IP2Location.io error:', e);
      console.log('[GEOLOCATION FUNCTION] Trying fallback #1...');
    }

    // Try fallback #1 (ip-api.com)
    try {
      const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,isp,org,as,query`);
      if (response.ok) {
        const data = await response.json();
        if (data.status !== 'fail') {
          return {
            success: true,
            data: {
              lat: data.lat,
              lon: data.lon,
              city: data.city || 'Unknown',
              region: data.regionName || 'Unknown',
              country: data.country || 'Unknown',
              countryCode: data.countryCode || 'XX',
              isp: data.isp || 'Unknown ISP',
              org: data.org || 'Unknown',
              as: data.as || 'Unknown',
              query: data.query
            }
          };
        }
      }
    } catch (e) {
      console.log('[GEOLOCATION FUNCTION] ip-api.com failed, trying fallback #2');
    }

    // Try fallback #2 (ipwhois.app)
    try {
      const response = await fetch(`https://ipwhois.app/json/${ip}`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          return {
            success: true,
            data: {
              lat: data.latitude,
              lon: data.longitude,
              city: data.city || 'Unknown',
              region: data.region || 'Unknown',
              country: data.country || 'Unknown',
              countryCode: data.country_code || 'XX',
              isp: data.isp || 'Unknown ISP',
              org: data.org || 'Unknown',
              as: data.asn || 'Unknown',
              query: ip
            }
          };
        }
      }
    } catch (e) {
      console.log('[GEOLOCATION FUNCTION] ipwhois.app failed');
    }

    console.log('[GEOLOCATION FUNCTION] All APIs failed');
    return { success: false, error: 'All geolocation APIs failed' };
  } catch (error) {
    console.error('[GEOLOCATION FUNCTION] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}

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
