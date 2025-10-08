/**
 * Delete a traceroute schedule using App State Service
 */

import { stateClient } from '@dynatrace-sdk/client-state';
import getSchedules from './getSchedules.function';

const STATE_KEY = 'traceroute-schedules';

export default async function (payload: unknown = undefined) {
  console.log('[DELETE SCHEDULE] Deleting schedule');

  try {
    const { scheduleId } = payload as { scheduleId: string };

    if (!scheduleId) {
      return {
        success: false,
        error: 'Schedule ID is required'
      };
    }

    // Get current schedules
    const getResult = await getSchedules();
    const schedules = getResult.schedules || [];

    const index = schedules.findIndex((s: any) => s.id === scheduleId);

    if (index >= 0) {
      schedules.splice(index, 1);
      console.log('[DELETE SCHEDULE] Deleted schedule:', scheduleId);

      // Update app state
      try {
        await stateClient.setAppState({
          key: STATE_KEY,
          body: {
            value: JSON.stringify(schedules)
          }
        });
        console.log('[DELETE SCHEDULE] Updated app state');
      } catch (storageError) {
        console.error('[DELETE SCHEDULE] Failed to update storage:', storageError);
      }

      return {
        success: true
      };
    } else {
      return {
        success: false,
        error: 'Schedule not found'
      };
    }
  } catch (error) {
    console.error('[DELETE SCHEDULE] Error:', error);
    return {
      success: false,
      error: String(error)
    };
  }
}
