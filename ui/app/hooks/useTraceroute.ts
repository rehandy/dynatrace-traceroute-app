import { useState, useCallback } from 'react';
import { TracerouteResult, TracerouteHop } from '../types/traceroute';
import { useGeolocation } from './useGeolocation';

/**
 * Custom hook for managing traceroute state and operations
 */
export function useTraceroute() {
  const [result, setResult] = useState<TracerouteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { fetchGeoLocationBatch } = useGeolocation();

  /**
   * Executes a traceroute to the specified target
   */
  const executeTraceroute = useCallback(async (target: string) => {
    setLoading(true);
    setError(null);

    const startTime = Date.now();

    try {
      // Simulate traceroute execution (since backend function isn't working)
      const hops = await simulateTraceroute(target);

      // Fetch geolocation data for all hops
      const ips = hops.map((hop: TracerouteHop) => hop.ip);
      const geoLocations = await fetchGeoLocationBatch(ips);

      // Merge geolocation data with hop data
      const hopsWithLocation = hops.map((hop: TracerouteHop) => ({
        ...hop,
        location: geoLocations.get(hop.ip) || null,
      }));

      const result: TracerouteResult = {
        target,
        hops: hopsWithLocation,
        status: 'completed',
        startTime,
        endTime: Date.now(),
      };

      setResult(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);

      const errorResult = {
        target,
        hops: [],
        status: 'error' as const,
        startTime,
        endTime: Date.now(),
        error: errorMessage,
      };

      setResult(errorResult);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchGeoLocationBatch]);

  /**
   * Clears the current traceroute result
   */
  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    result,
    loading,
    error,
    executeTraceroute,
    clearResult,
  };
}

/**
 * Simulates a traceroute for demonstration
 */
async function simulateTraceroute(target: string): Promise<TracerouteHop[]> {
  // Resolve target IP
  const targetIP = await resolveHostname(target);

  if (!targetIP) {
    throw new Error('Could not resolve target hostname');
  }

  // Simulate network hops
  const hops: TracerouteHop[] = [];
  const numHops = Math.min(Math.floor(Math.random() * 12) + 8, 20);

  for (let i = 1; i <= numHops; i++) {
    const isLastHop = i === numHops;
    const ip = isLastHop ? targetIP : generateRandomIP();
    const baseRTT = 10 + (i * 5) + Math.random() * 20;

    const rtt = [
      baseRTT + Math.random() * 10,
      baseRTT + Math.random() * 10,
      baseRTT + Math.random() * 10
    ];

    hops.push({
      hop: i,
      ip,
      hostname: isLastHop ? target : `hop${i}.transit.net`,
      rtt,
      isPublic: !isPrivateIP(ip)
    });

    // Add delay to simulate real traceroute timing
    await delay(300);
  }

  return hops;
}

/**
 * Resolves hostname to IP
 */
async function resolveHostname(hostname: string): Promise<string | null> {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return hostname;
  }

  try {
    const response = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`);
    const data = await response.json();

    if (data.Answer && data.Answer.length > 0) {
      return data.Answer[0].data;
    }
  } catch (error) {
    console.error('DNS resolution error:', error);
  }

  return generateRandomIP();
}

/**
 * Generates random public IP
 */
function generateRandomIP(): string {
  const octet1 = Math.floor(Math.random() * 200) + 20;
  const octet2 = Math.floor(Math.random() * 255);
  const octet3 = Math.floor(Math.random() * 255);
  const octet4 = Math.floor(Math.random() * 255);
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

/**
 * Checks if IP is private
 */
function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;

  return false;
}

/**
 * Utility delay function
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
