import React, { useState, useEffect } from 'react';
import { sendIntent } from '@dynatrace-sdk/navigation';

interface Schedule {
  id: string;
  name: string;
  target: string;
  intervalMinutes: number;
  enabled: boolean;
  lastRun?: string;
  workflowId?: string;
}

const ScheduleManager: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    target: '',
    intervalMinutes: 60
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load schedules from backend
  const loadSchedules = async () => {
    try {
      console.log('Loading schedules from backend...');
      setLoading(true);
      const response = await fetch('/api/getSchedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();

      if (data.success) {
        console.log('Loaded schedules:', data.schedules);
        setSchedules(data.schedules || []);
      } else {
        console.error('Failed to load schedules:', data.error);
        setError('Failed to load schedules: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
      setError('Failed to load schedules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleSaveSchedule = async () => {
    if (!formData.name || !formData.target || !formData.intervalMinutes) {
      setError('Name, target, and interval are required');
      return;
    }

    if (formData.intervalMinutes < 1) {
      setError('Interval must be at least 1 minute');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const schedule: Schedule = editingSchedule
        ? { ...editingSchedule, ...formData }
        : {
            id: Date.now().toString(),
            ...formData,
            enabled: true
          };

      console.log('Saving schedule:', schedule);

      const response = await fetch('/api/saveSchedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule })
      });

      const data = await response.json();

      if (data.success) {
        console.log('Schedule saved successfully');
        await loadSchedules();
        setFormData({ name: '', target: '', intervalMinutes: 60 });
        setShowAddForm(false);
        setEditingSchedule(null);
      } else {
        console.error('Failed to save schedule:', data.error);
        console.error('Error details:', data.errorDetails);
        const errorMsg = data.errorDetails ?
          `${data.error} (${JSON.stringify(data.errorDetails)})` :
          data.error;
        setError('Failed to save schedule: ' + errorMsg);
      }
    } catch (error) {
      console.error('Failed to save schedule:', error);
      setError('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const handleEditSchedule = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      target: schedule.target,
      intervalMinutes: schedule.intervalMinutes || 60
    });
    setShowAddForm(true);
  };

  const handleCancelEdit = () => {
    setEditingSchedule(null);
    setFormData({ name: '', target: '', intervalMinutes: 60 });
    setShowAddForm(false);
    setError(null);
  };

  // Create workflow using intent
  const handleCreateWorkflow = (schedule: Schedule) => {
    const workflowPayload = {
      title: `Traceroute: ${schedule.name}`,
      description: `Automated traceroute for ${schedule.target}`,
      tasks: {
        run_traceroute: {
          name: 'run_traceroute',
          description: `Execute traceroute for ${schedule.name}`,
          action: 'my.traceroute.app.v.2:runTraceroute',
          input: {
            scheduleId: schedule.id
          },
          position: { x: 0, y: 1 },
          active: true
        }
      },
      trigger: {
        schedule: {
          trigger: {
            type: 'interval',
            intervalMinutes: schedule.intervalMinutes
          },
          timezone: 'UTC',
          isActive: true
        }
      }
    };

    console.log('[CREATE WORKFLOW] Sending intent with payload:', workflowPayload);

    // Use sendIntent to trigger workflow creation
    sendIntent(workflowPayload, {
      recommendedAppId: 'dynatrace.workflows',
      recommendedIntentId: 'create'
    });
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/deleteSchedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId })
      });

      const data = await response.json();

      if (data.success) {
        await loadSchedules();
      } else {
        setError('Failed to delete schedule: ' + data.error);
      }
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      setError('Failed to delete schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ margin: 0 }}>Scheduled Traceroutes</h2>
        <button
          onClick={() => {
            if (showAddForm) {
              handleCancelEdit();
            } else {
              setShowAddForm(true);
            }
          }}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1496ff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            opacity: loading ? 0.6 : 1
          }}
        >
          {showAddForm ? 'Cancel' : 'Add Schedule'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ffebee',
          color: '#c62828',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {showAddForm && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          <h3 style={{ marginTop: 0 }}>
            {editingSchedule ? 'Edit Schedule' : 'Add New Schedule'}
          </h3>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Schedule Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Google DNS Monitor"
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Target
            </label>
            <input
              type="text"
              value={formData.target}
              onChange={(e) => setFormData({ ...formData, target: e.target.value })}
              placeholder="e.g., google.com or 8.8.8.8"
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontWeight: 'bold' }}>
              Interval (minutes)
            </label>
            <input
              type="number"
              min="1"
              value={formData.intervalMinutes}
              onChange={(e) => setFormData({ ...formData, intervalMinutes: parseInt(e.target.value) || 60 })}
              placeholder="e.g., 60"
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '12px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#1976d2' }}>
              <strong>💡 Tip:</strong> After saving, click "Create Workflow" to automatically generate
              a pre-configured Dynatrace Workflow with the schedule trigger and traceroute action already set up!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSaveSchedule}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#1496ff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}
            >
              {editingSchedule ? 'Update Schedule' : 'Save Schedule'}
            </button>
            <button
              onClick={handleCancelEdit}
              disabled={loading}
              style={{
                padding: '8px 16px',
                backgroundColor: '#666',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading && schedules.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>Loading schedules...</p>
      ) : schedules.length === 0 ? (
        <p style={{ color: '#666', fontStyle: 'italic' }}>
          No schedules configured. Click "Add Schedule" to create one.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {schedules.map(schedule => (
            <div
              key={schedule.id}
              style={{
                padding: '16px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: '#fff'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0' }}>{schedule.name}</h3>
                  <p style={{ margin: '4px 0', color: '#666' }}>
                    <strong>Target:</strong> {schedule.target}
                  </p>
                  <p style={{ margin: '4px 0', color: '#666' }}>
                    <strong>Interval:</strong> {schedule.intervalMinutes} minutes
                  </p>
                  <p style={{ margin: '4px 0', color: '#1976d2', fontSize: '12px' }}>
                    <strong>ID:</strong> {schedule.id}
                  </p>
                  {schedule.workflowId && (
                    <p style={{ margin: '4px 0', color: '#4caf50', fontSize: '12px' }}>
                      <strong>✓ Workflow:</strong> {schedule.workflowId}
                    </p>
                  )}
                  {schedule.lastRun && (
                    <p style={{ margin: '4px 0', color: '#666', fontSize: '12px' }}>
                      <strong>Last run:</strong> {new Date(schedule.lastRun).toLocaleString()}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleEditSchedule(schedule)}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleCreateWorkflow(schedule)}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#73be28',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: loading ? 0.6 : 1
                    }}
                    title="Create a Dynatrace Workflow for this schedule"
                  >
                    Create Workflow
                  </button>
                  <button
                    onClick={() => handleDeleteSchedule(schedule.id)}
                    disabled={loading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#d32f2f',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '12px',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#e3f2fd',
        borderRadius: '4px',
        fontSize: '13px',
        color: '#1565c0'
      }}>
        <strong>ℹ️ Workflow Integration:</strong> Click "Create Workflow" on any schedule to automatically
        open the Workflow editor with a pre-configured workflow. The workflow will include a schedule trigger
        (set to your interval) and the traceroute action. Just click "Save" in the Workflow editor to activate it!
        When executed, traceroute data is ingested as logs with attributes like <code>traceroute.schedule</code>,
        <code>traceroute.target</code>, <code>traceroute.hop</code>, and geolocation data.
      </div>
    </div>
  );
};

export default ScheduleManager;
