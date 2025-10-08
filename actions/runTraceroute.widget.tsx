import React, { useEffect, useState } from 'react';
import { FormField, Label } from '@dynatrace/strato-components-preview/forms';
import { ActionWidget } from '@dynatrace-sdk/automation-action-utils';

interface Schedule {
  id: string;
  name: string;
  target: string;
  enabled: boolean;
  lastRun?: string;
}

export interface RunTracerouteInput {
  scheduleId: string;
}

const RunTracerouteWidget: ActionWidget<RunTracerouteInput> = (props) => {
  const { value, onValueChanged } = props;
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/getSchedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();
        console.log('[WIDGET] Fetch result:', result);

        if (result.success) {
          const fetchedSchedules = result.schedules || [];
          setSchedules(fetchedSchedules);
          console.log('[WIDGET] Loaded schedules:', fetchedSchedules.length);

          // Set default value to first schedule if not already set
          if (fetchedSchedules.length > 0 && !value?.scheduleId) {
            onValueChanged({ scheduleId: fetchedSchedules[0].id });
            console.log('[WIDGET] Set default scheduleId:', fetchedSchedules[0].id);
          }
        } else {
          setError(result.error || 'Failed to fetch schedules');
        }
      } catch (err: any) {
        console.error('[WIDGET] Fetch error:', err);
        setError(err?.message || String(err));
      } finally {
        setLoading(false);
      }
    };

    fetchSchedules();
  }, []);

  if (loading) {
    return <div style={{ padding: '16px' }}>Loading schedules...</div>;
  }

  if (error) {
    return <div style={{ color: 'red', padding: '16px' }}>Error: {error}</div>;
  }

  if (schedules.length === 0) {
    return (
      <div style={{ padding: '16px', color: '#666' }}>
        No schedules found. Create a schedule in the Visual Traceroute app first.
      </div>
    );
  }

  console.log('[WIDGET] Rendering with value:', value);

  return (
    <FormField>
      <Label>Select Schedule</Label>
      <select
        id="scheduleId"
        value={value?.scheduleId || ''}
        style={{
          width: '100%',
          padding: '8px 12px',
          fontSize: '14px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: 'white',
          cursor: 'pointer'
        }}
        onChange={(e: any) => {
          const newScheduleId = e.target.value;
          console.log('[WIDGET] Selection changed to:', newScheduleId);
          onValueChanged({ scheduleId: newScheduleId });
        }}
      >
        {schedules.map((schedule) => {
          console.log('[WIDGET] Rendering option:', schedule.id, schedule.name);
          return (
            <option key={schedule.id} value={schedule.id}>
              {schedule.name} - {schedule.target}
            </option>
          );
        })}
      </select>
    </FormField>
  );
};

export default RunTracerouteWidget;
