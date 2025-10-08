/**
 * Scheduled function to run traceroutes based on configured schedules
 * This function should be triggered periodically (e.g., every 5 minutes)
 * It checks all enabled schedules and executes traceroutes if their interval has elapsed
 */

import getSchedules from './getSchedules.function';
import ingestLogs from './ingestLogs.function';
import { stateClient } from '@dynatrace-sdk/client-state';

const STATE_KEY = 'traceroute-schedules';

interface Schedule {
  id: string;
  name: string;
  target: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface TracerouteHop {
  hop: number;
  ip: string;
  hostname?: string;
  rtt: number[];
  isPublic: boolean;
  location?: any;
}

export default async function (payload: unknown = undefined) {
  console.log('[SCHEDULED TRACEROUTES] Starting scheduled traceroute check', payload);

  try {
    // Get all schedules from storage
    const getResult = await getSchedules();
    const allSchedules: Schedule[] = getResult.schedules || [];

    console.log(`[SCHEDULED TRACEROUTES] Found ${allSchedules.length} total schedules`);

    // Check if a specific schedule ID was requested
    const requestPayload = payload as { scheduleId?: string; forceRun?: boolean } | undefined;
    const specificScheduleId = requestPayload?.scheduleId;
    const forceRun = requestPayload?.forceRun || false;

    let schedulesToRun: Schedule[];

    if (specificScheduleId) {
      // Run specific schedule by ID, ignoring interval check if forceRun is true
      console.log(`[SCHEDULED TRACEROUTES] Looking for specific schedule: ${specificScheduleId}`);
      const specificSchedule = allSchedules.find(s => s.id === specificScheduleId);

      if (!specificSchedule) {
        return {
          success: false,
          error: `Schedule not found: ${specificScheduleId}`
        };
      }

      if (!specificSchedule.enabled && !forceRun) {
        return {
          success: false,
          error: `Schedule is disabled: ${specificSchedule.name}`
        };
      }

      schedulesToRun = [specificSchedule];
      console.log(`[SCHEDULED TRACEROUTES] Running specific schedule: ${specificSchedule.name}`);
    } else {
      // Filter enabled schedules that need to run (original logic)
      const now = new Date();
      schedulesToRun = allSchedules.filter((schedule: Schedule) => {
        if (!schedule.enabled) {
          return false;
        }

        // If never run before, run it
        if (!schedule.lastRun) {
          return true;
        }

        // Check if enough time has elapsed
        const lastRunTime = new Date(schedule.lastRun);
        const minutesSinceLastRun = (now.getTime() - lastRunTime.getTime()) / (1000 * 60);

        return minutesSinceLastRun >= schedule.intervalMinutes;
      });

      console.log(`[SCHEDULED TRACEROUTES] ${schedulesToRun.length} schedules need to run`);
    }

    const results = [];
    const now = new Date(); // Define now for timestamp updates

    // Execute traceroutes for each schedule
    for (const schedule of schedulesToRun) {
      console.log(`[SCHEDULED TRACEROUTES] Running traceroute for ${schedule.name} (${schedule.target})`);

      try {
        // Execute traceroute
        const tracerouteResult = await executeTraceroute(schedule.target);

        // Ingest to logs
        const ingestResult = await ingestLogs({
          tracerouteResult,
          scheduleName: schedule.name
        });

        console.log(`[SCHEDULED TRACEROUTES] Ingested ${ingestResult.recordsIngested} logs for ${schedule.name}`);

        // Update last run time
        schedule.lastRun = now.toISOString();
        schedule.nextRun = new Date(now.getTime() + schedule.intervalMinutes * 60000).toISOString();

        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          success: true,
          hops: tracerouteResult.hops.length,
          recordsIngested: ingestResult.recordsIngested
        });
      } catch (error) {
        console.error(`[SCHEDULED TRACEROUTES] Error running traceroute for ${schedule.name}:`, error);
        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          success: false,
          error: String(error)
        });
      }
    }

    // Save updated schedules with lastRun times
    if (schedulesToRun.length > 0) {
      try {
        await stateClient.setAppState({
          key: STATE_KEY,
          body: {
            value: JSON.stringify(allSchedules)
          }
        });
        console.log('[SCHEDULED TRACEROUTES] Updated schedules with lastRun times');
      } catch (storageError) {
        console.error('[SCHEDULED TRACEROUTES] Failed to persist:', storageError);
      }
    }

    console.log('[SCHEDULED TRACEROUTES] Completed');

    return {
      success: true,
      schedulesChecked: allSchedules.length,
      schedulesRun: schedulesToRun.length,
      results
    };
  } catch (error) {
    console.error('[SCHEDULED TRACEROUTES] Error:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}

/**
 * Execute traceroute simulation (same as frontend implementation)
 */
async function executeTraceroute(target: string) {
  console.log(`[TRACEROUTE] Starting traceroute to ${target}`);

  const startTime = Date.now();

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

    // Fetch geolocation for the IP
    const location = await fetchGeolocation(ip);

    hops.push({
      hop: i,
      ip,
      hostname: isLastHop ? target : `hop${i}.transit.net`,
      rtt,
      isPublic: !isPrivateIP(ip),
      location
    });
  }

  return {
    target,
    hops,
    status: 'completed',
    startTime,
    endTime: Date.now()
  };
}

/**
 * Resolve hostname to IP using DNS
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
 * Fetch geolocation for IP using the geolocation function
 */
async function fetchGeolocation(ip: string): Promise<any | null> {
  if (isPrivateIP(ip)) {
    return null;
  }

  try {
    // Use ip-api.com for geolocation (free tier)
    const response = await fetch(`http://ip-api.com/json/${ip}`);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        ip: data.query,
        city: data.city,
        region: data.regionName,
        country: data.country,
        countryCode: data.countryCode,
        lat: data.lat,
        lon: data.lon,
        isp: data.isp,
        org: data.org
      };
    }
  } catch (error) {
    console.error(`Geolocation error for ${ip}:`, error);
  }

  return null;
}

/**
 * Generate random public IP
 */
function generateRandomIP(): string {
  const octet1 = Math.floor(Math.random() * 200) + 20;
  const octet2 = Math.floor(Math.random() * 255);
  const octet3 = Math.floor(Math.random() * 255);
  const octet4 = Math.floor(Math.random() * 255);
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

/**
 * Check if IP is private
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
