/**
 * Save or update a traceroute schedule using App State Service
 */

import { stateClient } from '@dynatrace-sdk/client-state';
import getSchedules from './getSchedules.function';

const STATE_KEY = 'traceroute-schedules';

export default async function (payload: unknown = undefined) {
  console.log('[SAVE SCHEDULE] Saving schedule, payload:', JSON.stringify(payload));

  try {
    const { schedule } = payload as { schedule: any };
    console.log('[SAVE SCHEDULE] Parsed schedule:', JSON.stringify(schedule));

    if (!schedule || !schedule.id) {
      console.error('[SAVE SCHEDULE] Invalid schedule data:', schedule);
      return {
        success: false,
        error: 'Invalid schedule data'
      };
    }

    // Get current schedules
    const getResult = await getSchedules();
    const schedules = getResult.schedules || [];

    // Find existing schedule
    const existingIndex = schedules.findIndex((s: any) => s.id === schedule.id);

    if (existingIndex >= 0) {
      // Update existing
      schedules[existingIndex] = schedule;
      console.log('[SAVE SCHEDULE] Updated schedule:', schedule.id);
    } else {
      // Add new
      schedules.push(schedule);
      console.log('[SAVE SCHEDULE] Added new schedule:', schedule.id);
    }

    // Save to app state storage
    try {
      await stateClient.setAppState({
        key: STATE_KEY,
        body: {
          value: JSON.stringify(schedules)
        }
      });
      console.log('[SAVE SCHEDULE] Saved to app state');
    } catch (storageError: any) {
      console.error('[SAVE SCHEDULE] Failed to persist to storage:', storageError);

      // Extract detailed error information
      const errorDetails = {
        message: storageError?.message || 'Unknown error',
        name: storageError?.name,
        code: storageError?.code,
        statusCode: storageError?.statusCode,
        body: storageError?.body,
        errorCode: storageError?.errorCode,
        constraintViolations: storageError?.constraintViolations
      };

      console.error('[SAVE SCHEDULE] Error details:', JSON.stringify(errorDetails));

      return {
        success: false,
        error: `Failed to save to storage: ${errorDetails.message}`,
        errorDetails
      };
    }

    return {
      success: true,
      schedule
    };
  } catch (error) {
    console.error('[SAVE SCHEDULE] Error:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}
