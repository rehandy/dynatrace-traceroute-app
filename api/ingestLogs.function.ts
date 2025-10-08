/**
 * App Function to ingest traceroute data into Dynatrace logs
 * Uses the Log Ingest API to store traceroute hop data
 */

import { logsClient } from '@dynatrace-sdk/client-classic-environment-v2';

export default async function (payload: unknown = undefined) {
  console.log('[INGEST LOGS] Starting log ingestion');
  console.log('[INGEST LOGS] Payload:', JSON.stringify(payload));

  try {
    const { tracerouteResult, scheduleName } = payload as {
      tracerouteResult: any;
      scheduleName?: string;
    };

    if (!tracerouteResult || !tracerouteResult.hops) {
      return {
        success: false,
        error: 'Invalid traceroute result provided'
      };
    }

    // Prepare log records for each hop
    const logRecords = tracerouteResult.hops.map((hop: any) => {
      const logEntry: any = {
        timestamp: new Date().toISOString(),
        'log.source': 'traceroute-app',
        'traceroute.target': tracerouteResult.target,
        'traceroute.hop': hop.hop,
        'traceroute.ip': hop.ip,
        'traceroute.hostname': hop.hostname || 'unknown',
        'traceroute.status': tracerouteResult.status,
        severity: 'INFO',
        content: `Traceroute hop ${hop.hop} to ${tracerouteResult.target}: ${hop.ip} (${hop.hostname || 'unknown'})`
      };

      // Add schedule name if provided
      if (scheduleName) {
        logEntry['traceroute.schedule'] = scheduleName;
      }

      // Add RTT information if available
      if (hop.rtt && hop.rtt.length > 0) {
        const avgRtt = hop.rtt.reduce((sum: number, val: number) => sum + val, 0) / hop.rtt.length;
        logEntry['traceroute.rtt.avg'] = avgRtt;
        logEntry['traceroute.rtt.min'] = Math.min(...hop.rtt);
        logEntry['traceroute.rtt.max'] = Math.max(...hop.rtt);
        logEntry.content += ` - Avg RTT: ${avgRtt.toFixed(2)}ms`;
      }

      // Add geolocation data if available
      if (hop.location) {
        logEntry['traceroute.location.city'] = hop.location.city;
        logEntry['traceroute.location.country'] = hop.location.country;
        logEntry['traceroute.location.countryCode'] = hop.location.countryCode;
        logEntry['traceroute.location.lat'] = hop.location.lat;
        logEntry['traceroute.location.lon'] = hop.location.lon;
        logEntry['traceroute.location.isp'] = hop.location.isp;
        logEntry.content += ` - Location: ${hop.location.city}, ${hop.location.country}`;
      }

      return logEntry;
    });

    console.log('[INGEST LOGS] Prepared log records:', logRecords.length);

    // Ingest logs using Dynatrace SDK
    const result = await logsClient.storeLog({
      body: logRecords,
      type: 'application/json; charset=utf-8'
    });

    console.log('[INGEST LOGS] Ingestion successful');

    return {
      success: true,
      recordsIngested: logRecords.length
    };
  } catch (error) {
    console.error('[INGEST LOGS] Error:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}
