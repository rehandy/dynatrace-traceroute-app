/**
 * Get all configured traceroute schedules
 * Uses Dynatrace App State Service for persistence
 */

import { stateClient } from '@dynatrace-sdk/client-state';

const STATE_KEY = 'traceroute-schedules';

export default async function (payload: unknown = undefined) {
  console.log('[GET SCHEDULES] Fetching schedules from app state');

  try {
    // Get the app state
    const state = await stateClient.getAppState({
      key: STATE_KEY
    });

    console.log('[GET SCHEDULES] State retrieved:', !!state.value);

    if (state.value) {
      const schedules = JSON.parse(state.value);
      console.log('[GET SCHEDULES] Loaded schedules:', Array.isArray(schedules) ? schedules.length : 0);

      return {
        success: true,
        schedules: Array.isArray(schedules) ? schedules : []
      };
    }

    // No state found, return empty array
    console.log('[GET SCHEDULES] No schedules found, returning empty array');
    return {
      success: true,
      schedules: []
    };
  } catch (error: any) {
    // If state doesn't exist yet, return empty array
    if (error?.statusCode === 404 || error?.code === 'NOT_FOUND') {
      console.log('[GET SCHEDULES] State not found (first time), returning empty array');
      return {
        success: true,
        schedules: []
      };
    }

    console.error('[GET SCHEDULES] Error:', error);
    return {
      success: false,
      error: String(error),
      schedules: []
    };
  }
}
