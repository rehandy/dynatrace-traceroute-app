import React, { useMemo } from 'react';
import { DataTableV2 } from '@dynatrace/strato-components-preview/tables';
import { TracerouteResult } from '../types/traceroute';

interface TracerouteTableProps {
  result: TracerouteResult;
}

const TracerouteTable: React.FC<TracerouteTableProps> = ({ result }) => {
  const hops = result.hops;
  const loading = false;
  const formatRTT = (rtt: number[]): string => {
    if (!rtt || rtt.length === 0) return 'N/A';
    return rtt.map(r => `${r.toFixed(2)}ms`).join(', ');
  };

  const getAvgRTT = (rtt: number[]): number | null => {
    if (!rtt || rtt.length === 0) return null;
    return rtt.reduce((sum, val) => sum + val, 0) / rtt.length;
  };

  const columns = useMemo(() => [
    {
      id: 'hop',
      header: 'Hop',
      accessor: 'hop',
      columnType: 'number' as const,
    },
    {
      id: 'ip',
      header: 'IP Address',
      accessor: 'ip',
      columnType: 'text' as const,
    },
    {
      id: 'hostname',
      header: 'Hostname',
      accessor: 'hostname',
      columnType: 'text' as const,
    },
    {
      id: 'location',
      header: 'Location',
      accessor: 'location',
      columnType: 'text' as const,
    },
    {
      id: 'isp',
      header: 'ISP',
      accessor: 'isp',
      columnType: 'text' as const,
    },
    {
      id: 'rtt',
      header: 'RTT',
      accessor: 'rtt',
      columnType: 'text' as const,
    },
    {
      id: 'avgRtt',
      header: 'Avg RTT (ms)',
      accessor: 'avgRtt',
      columnType: 'number' as const,
    },
  ], []);

  const data = useMemo(() =>
    hops.map(hop => ({
      hop: hop.hop,
      ip: hop.ip,
      hostname: hop.hostname || '-',
      location: hop.location
        ? `${hop.location.city}, ${hop.location.region}, ${hop.location.countryCode}`
        : hop.isPublic ? 'Unknown' : 'Private IP',
      isp: hop.location?.isp || '-',
      rtt: formatRTT(hop.rtt),
      avgRtt: getAvgRTT(hop.rtt),
    })),
    [hops]
  );

  if (hops.length === 0 && !loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <p>No traceroute data available</p>
        <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
          Enter a target hostname or IP address to start a traceroute
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <DataTableV2 data={data} columns={columns} />
    </div>
  );
};

export default TracerouteTable;
