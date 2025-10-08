import React, { useState } from 'react';
import { RunQueryButton } from '@dynatrace/strato-components-preview/buttons';
import { Flex } from '@dynatrace/strato-components/layouts';

interface TracerouteFormProps {
  onExecute: (target: string, ingestToLogs: boolean) => void;
  loading?: boolean;
}

const TracerouteForm: React.FC<TracerouteFormProps> = ({ onExecute, loading = false }) => {
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [ingestToLogs, setIngestToLogs] = useState(false);

  const validateTarget = (value: string): boolean => {
    if (!value.trim()) {
      setError('Target is required');
      return false;
    }

    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    const hostnamePattern = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!ipPattern.test(value) && !hostnamePattern.test(value)) {
      setError('Invalid hostname or IP address format');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateTarget(target)) {
      onExecute(target.trim(), ingestToLogs);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Flex flexDirection="row" gap={16} alignItems="flex-start">
        <div style={{ width: '500px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Target Hostname or IP Address
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => {
              setTarget(e.target.value);
              if (error) setError('');
            }}
            disabled={loading}
            placeholder="e.g., google.com or 8.8.8.8"
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '4px',
              border: error ? '1px solid #f44336' : '1px solid #ccc',
              fontSize: '14px',
              boxSizing: 'border-box'
            }}
          />
          {error && (
            <p style={{ marginTop: '4px', color: '#f44336', fontSize: '12px' }}>
              {error}
            </p>
          )}
        </div>
        <div style={{ paddingTop: '28px', flexShrink: 0 }}>
          <RunQueryButton
            queryState={loading ? 'loading' : 'idle'}
            onClick={handleSubmit}
            disabled={!target.trim()}
          />
        </div>
      </Flex>

      <div style={{ marginTop: '16px' }}>
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={ingestToLogs}
            onChange={(e) => setIngestToLogs(e.target.checked)}
            disabled={loading}
            style={{ marginRight: '8px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '14px' }}>
            Ingest traceroute data to Dynatrace logs
          </span>
        </label>
      </div>

      <p style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
        Enter a hostname (e.g., google.com) or IP address (e.g., 8.8.8.8) to trace the network path
      </p>
    </form>
  );
};

export default TracerouteForm;
