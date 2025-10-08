import { useState } from 'react';
import { Page } from '@dynatrace/strato-components-preview/layouts';
import { TitleBar } from '@dynatrace/strato-components-preview/layouts';
import { IntlProvider } from 'react-intl';
import TracerouteForm from './components/TracerouteForm';
import TracerouteTable from './components/TracerouteTable';
import TracerouteMap from './components/TracerouteMap';
import ScheduleManager from './components/ScheduleManager';
import { useTraceroute } from './hooks/useTraceroute';

export const App = () => {
  const { result, loading, error, executeTraceroute } = useTraceroute();
  const [activeView, setActiveView] = useState<'table' | 'map'>('table');
  const [ingestStatus, setIngestStatus] = useState<string | null>(null);

  const handleTraceroute = async (target: string, ingestToLogs: boolean) => {
    setIngestStatus(null);
    const tracerouteResult = await executeTraceroute(target);

    // If ingest is enabled and we have a result, ingest to logs
    if (ingestToLogs && tracerouteResult) {
      try {
        const response = await fetch('/api/ingestLogs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tracerouteResult })
        });

        const ingestResult = await response.json();

        if (ingestResult.success) {
          setIngestStatus(`✓ Successfully ingested ${ingestResult.recordsIngested} log records to Dynatrace`);
        } else {
          setIngestStatus(`✗ Failed to ingest logs: ${ingestResult.error}`);
        }
      } catch (err) {
        setIngestStatus(`✗ Error ingesting logs: ${err}`);
      }
    }
  };

  return (
    <IntlProvider locale="en">
      <Page>
        <Page.Header>
          <TitleBar>
            <TitleBar.Title>Visual Traceroute</TitleBar.Title>
            <TitleBar.Subtitle>Network path visualization with geolocation</TitleBar.Subtitle>
          </TitleBar>
        </Page.Header>
        <Page.Main>
          <div style={{ padding: '16px' }}>
            <TracerouteForm
              onExecute={handleTraceroute}
              loading={loading}
            />

            {error && (
              <div style={{ marginTop: '16px', color: 'red' }}>
                Error: {error}
              </div>
            )}

            {ingestStatus && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                borderRadius: '4px',
                backgroundColor: ingestStatus.startsWith('✓') ? '#e8f5e9' : '#ffebee',
                color: ingestStatus.startsWith('✓') ? '#2e7d32' : '#c62828',
                fontSize: '14px'
              }}>
                {ingestStatus}
              </div>
            )}

            {result && (
              <div style={{ marginTop: '24px' }}>
                <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setActiveView('table')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: activeView === 'table' ? '#1496ff' : '#fff',
                      color: activeView === 'table' ? '#fff' : '#000',
                      border: '1px solid #1496ff',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Table View
                  </button>
                  <button
                    onClick={() => setActiveView('map')}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: activeView === 'map' ? '#1496ff' : '#fff',
                      color: activeView === 'map' ? '#fff' : '#000',
                      border: '1px solid #1496ff',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Map View
                  </button>
                </div>

                {activeView === 'table' ? (
                  <TracerouteTable result={result} />
                ) : (
                  <TracerouteMap result={result} />
                )}
              </div>
            )}

            <ScheduleManager />
          </div>
        </Page.Main>
      </Page>
    </IntlProvider>
  );
};
