import React, { useMemo } from 'react';
import { MapView, ConnectionLayer, DotLayer, Tooltip } from '@dynatrace/strato-geo';
import { LocationMarkerFilledIcon } from '@dynatrace/strato-icons';
import { TracerouteResult } from '../types/traceroute';

interface TracerouteMapProps {
  result: TracerouteResult;
}

/**
 * Visual Traceroute Map Component using Strato Geo
 * Displays network hops on an interactive map with connections
 */
const TracerouteMap: React.FC<TracerouteMapProps> = ({ result }) => {
  const hops = result.hops;
  // Filter hops with valid geolocation data
  const validHops = useMemo(() =>
    hops.filter(hop => hop.location && hop.location.lat && hop.location.lon),
    [hops]
  );

  // Helper function to get color based on RTT (latency)
  const getRTTColor = (avgRTT: number): string => {
    if (avgRTT < 20) return '#00C853'; // Green - excellent
    if (avgRTT < 50) return '#64DD17'; // Light green - good
    if (avgRTT < 100) return '#FFD600'; // Yellow - moderate
    if (avgRTT < 150) return '#FF6D00'; // Orange - slow
    return '#D50000'; // Red - very slow
  };

  // Calculate average RTT for a hop
  const getAvgRTT = (rtt: number[]): number => {
    if (!rtt || rtt.length === 0) return 0;
    return rtt.reduce((sum, val) => sum + val, 0) / rtt.length;
  };

  // Helper function to check if there are private IPs between two hops
  const hasPrivateIPsBetween = (startHopIndex: number, endHopIndex: number): boolean => {
    // Check all hops in the original hops array between these two valid hops
    const startHopNum = validHops[startHopIndex].hop;
    const endHopNum = validHops[endHopIndex].hop;

    for (let i = startHopNum + 1; i < endHopNum; i++) {
      const hop = hops.find(h => h.hop === i);
      if (hop && !hop.isPublic) {
        return true;
      }
    }
    return false;
  };

  // Create connections data for ConnectionLayer
  const connections = useMemo(() => {
    console.log('TracerouteMap - Valid hops:', validHops.length, validHops);

    if (validHops.length < 2) {
      console.log('Not enough valid hops for connections');
      return [];
    }

    // Create individual connections between consecutive hops with color-coded lines
    const connectionsData: any[] = [];

    for (let i = 0; i < validHops.length - 1; i++) {
      const currentHop = validHops[i];
      const nextHop = validHops[i + 1];

      const avgRTT = getAvgRTT(nextHop.rtt);
      const color = getRTTColor(avgRTT);

      // Check if there are private IPs between these two public hops
      const hasPrivateHops = hasPrivateIPsBetween(i, i + 1);

      connectionsData.push({
        path: [
          {
            name: `Hop ${currentHop.hop}: ${currentHop.hostname || currentHop.ip}`,
            latitude: currentHop.location!.lat,
            longitude: currentHop.location!.lon,
          },
          {
            name: `Hop ${nextHop.hop}: ${nextHop.hostname || nextHop.ip} (${avgRTT.toFixed(1)}ms)`,
            latitude: nextHop.location!.lat,
            longitude: nextHop.location!.lon,
          }
        ],
        line: {
          color: color,
          thickness: 3,
          style: hasPrivateHops ? 'dashed' : 'solid'
        }
      });
    }

    console.log('ConnectionLayer data:', connectionsData);
    return connectionsData;
  }, [validHops, hops]);

  if (validHops.length === 0) {
    return (
      <div style={{
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>No geographic data available</p>
          <p style={{ fontSize: '14px' }}>Hops with location data will appear on the map</p>
        </div>
      </div>
    );
  }

  if (validHops.length < 2) {
    return (
      <div style={{
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px'
      }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <p style={{ fontSize: '16px', marginBottom: '8px' }}>Need at least 2 hops to show map</p>
          <p style={{ fontSize: '14px' }}>Found {validHops.length} hop(s) with location data</p>
        </div>
      </div>
    );
  }

  // Prepare dot layer data with hop information - separate by position
  const firstHop = useMemo(() => {
    if (validHops.length === 0) return [];
    const hop = validHops[0];
    return [{
      latitude: hop.location!.lat,
      longitude: hop.location!.lon,
      hop: hop.hop,
      hostname: hop.hostname || hop.ip,
      ip: hop.ip,
      city: hop.location?.city,
      country: hop.location?.country,
      isp: hop.location?.isp,
      avgRtt: getAvgRTT(hop.rtt)
    }];
  }, [validHops]);

  const middleHops = useMemo(() => {
    if (validHops.length <= 2) return [];
    return validHops.slice(1, -1).map(hop => ({
      latitude: hop.location!.lat,
      longitude: hop.location!.lon,
      hop: hop.hop,
      hostname: hop.hostname || hop.ip,
      ip: hop.ip,
      city: hop.location?.city,
      country: hop.location?.country,
      isp: hop.location?.isp,
      avgRtt: getAvgRTT(hop.rtt)
    }));
  }, [validHops]);

  const lastHop = useMemo(() => {
    if (validHops.length <= 1) return [];
    const hop = validHops[validHops.length - 1];
    return [{
      latitude: hop.location!.lat,
      longitude: hop.location!.lon,
      hop: hop.hop,
      hostname: hop.hostname || hop.ip,
      ip: hop.ip,
      city: hop.location?.city,
      country: hop.location?.country,
      isp: hop.location?.isp,
      avgRtt: getAvgRTT(hop.rtt)
    }];
  }, [validHops]);

  return (
    <div style={{ position: 'relative', height: '500px', width: '100%' }}>
      <MapView>
        {/* Connection lines between hops */}
        <ConnectionLayer
          data={connections}
          curve="smooth"
        >
          <ConnectionLayer.Tooltip>
            {({ data }) => (
              <Tooltip.Body>
                {data.path.map((point: any, idx: number) => (
                  <Tooltip.Item key={idx}>
                    <Tooltip.Symbol>
                      <LocationMarkerFilledIcon />
                    </Tooltip.Symbol>
                    <Tooltip.Content>
                      <Tooltip.Text>{point.name}</Tooltip.Text>
                    </Tooltip.Content>
                  </Tooltip.Item>
                ))}
              </Tooltip.Body>
            )}
          </ConnectionLayer.Tooltip>
        </ConnectionLayer>

        {/* First hop marker (green - start) */}
        {firstHop.length > 0 && (
          <DotLayer
            data={firstHop}
            shape={<LocationMarkerFilledIcon />}
            shapeSize={35}
            color="#73be28"
          >
            <DotLayer.Tooltip>
              {({ data }) => {
                const hopData = data as any;
                return (
                  <Tooltip.Body>
                    <Tooltip.Item>
                      <Tooltip.Content>
                        <Tooltip.Text>{`Hop ${hopData.hop} (START)`}</Tooltip.Text>
                      </Tooltip.Content>
                    </Tooltip.Item>
                    <Tooltip.Item>
                      <Tooltip.Symbol>
                        <LocationMarkerFilledIcon />
                      </Tooltip.Symbol>
                      <Tooltip.Content>
                        <Tooltip.Text>Host</Tooltip.Text>
                      </Tooltip.Content>
                      <Tooltip.Value>{hopData.hostname}</Tooltip.Value>
                    </Tooltip.Item>
                    <Tooltip.Item>
                      <Tooltip.Content>
                        <Tooltip.Text>IP</Tooltip.Text>
                      </Tooltip.Content>
                      <Tooltip.Value>{hopData.ip}</Tooltip.Value>
                    </Tooltip.Item>
                    {hopData.city && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>Location</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.city}, {hopData.country}</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                    {hopData.isp && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>ISP</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.isp}</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                    {hopData.avgRtt > 0 && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>Avg RTT</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.avgRtt.toFixed(2)}ms</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                  </Tooltip.Body>
                );
              }}
            </DotLayer.Tooltip>
          </DotLayer>
        )}

        {/* Middle hop markers (blue) */}
        {middleHops.length > 0 && (
          <DotLayer
            data={middleHops}
            shape={<LocationMarkerFilledIcon />}
            shapeSize={30}
            color="#1496ff"
          >
            <DotLayer.Tooltip>
              {({ data }) => {
                const hopData = data as any;
                return (
                  <Tooltip.Body>
                    <Tooltip.Item>
                      <Tooltip.Content>
                        <Tooltip.Text>{`Hop ${hopData.hop}`}</Tooltip.Text>
                      </Tooltip.Content>
                    </Tooltip.Item>
                    <Tooltip.Item>
                      <Tooltip.Symbol>
                        <LocationMarkerFilledIcon />
                      </Tooltip.Symbol>
                      <Tooltip.Content>
                        <Tooltip.Text>Host</Tooltip.Text>
                      </Tooltip.Content>
                      <Tooltip.Value>{hopData.hostname}</Tooltip.Value>
                    </Tooltip.Item>
                    <Tooltip.Item>
                      <Tooltip.Content>
                        <Tooltip.Text>IP</Tooltip.Text>
                      </Tooltip.Content>
                      <Tooltip.Value>{hopData.ip}</Tooltip.Value>
                    </Tooltip.Item>
                    {hopData.city && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>Location</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.city}, {hopData.country}</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                    {hopData.isp && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>ISP</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.isp}</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                    {hopData.avgRtt > 0 && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>Avg RTT</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.avgRtt.toFixed(2)}ms</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                  </Tooltip.Body>
                );
              }}
            </DotLayer.Tooltip>
          </DotLayer>
        )}

        {/* Last hop marker (red - destination) */}
        {lastHop.length > 0 && (
          <DotLayer
            data={lastHop}
            shape={<LocationMarkerFilledIcon />}
            shapeSize={35}
            color="#dc172a"
          >
            <DotLayer.Tooltip>
              {({ data }) => {
                const hopData = data as any;
                return (
                  <Tooltip.Body>
                    <Tooltip.Item>
                      <Tooltip.Content>
                        <Tooltip.Text>{`Hop ${hopData.hop} (DESTINATION)`}</Tooltip.Text>
                      </Tooltip.Content>
                    </Tooltip.Item>
                    <Tooltip.Item>
                      <Tooltip.Symbol>
                        <LocationMarkerFilledIcon />
                      </Tooltip.Symbol>
                      <Tooltip.Content>
                        <Tooltip.Text>Host</Tooltip.Text>
                      </Tooltip.Content>
                      <Tooltip.Value>{hopData.hostname}</Tooltip.Value>
                    </Tooltip.Item>
                    <Tooltip.Item>
                      <Tooltip.Content>
                        <Tooltip.Text>IP</Tooltip.Text>
                      </Tooltip.Content>
                      <Tooltip.Value>{hopData.ip}</Tooltip.Value>
                    </Tooltip.Item>
                    {hopData.city && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>Location</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.city}, {hopData.country}</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                    {hopData.isp && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>ISP</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.isp}</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                    {hopData.avgRtt > 0 && (
                      <Tooltip.Item>
                        <Tooltip.Content>
                          <Tooltip.Text>Avg RTT</Tooltip.Text>
                        </Tooltip.Content>
                        <Tooltip.Value>{hopData.avgRtt.toFixed(2)}ms</Tooltip.Value>
                      </Tooltip.Item>
                    )}
                  </Tooltip.Body>
                );
              }}
            </DotLayer.Tooltip>
          </DotLayer>
        )}

        {/* Numbered labels overlay - using custom SVG overlay */}
        {validHops.map((hop) => (
          <div
            key={hop.hop}
            style={{
              position: 'absolute',
              pointerEvents: 'none',
              zIndex: 1000
            }}
          >
            {/* Hop number will be rendered by MapView's projection */}
          </div>
        ))}
      </MapView>

      {/* RTT Color Legend */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        fontSize: '12px',
        zIndex: 1000
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Latency (RTT)</div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#00C853', marginRight: '8px' }}></div>
          <span>&lt; 20ms (Excellent)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#64DD17', marginRight: '8px' }}></div>
          <span>20-50ms (Good)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#FFD600', marginRight: '8px' }}></div>
          <span>50-100ms (Moderate)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#FF6D00', marginRight: '8px' }}></div>
          <span>100-150ms (Slow)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ width: '20px', height: '3px', backgroundColor: '#D50000', marginRight: '8px' }}></div>
          <span>&gt; 150ms (Very Slow)</span>
        </div>
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '8px', marginTop: '8px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Line Style</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ width: '20px', height: '3px', backgroundColor: '#666', marginRight: '8px' }}></div>
            <span>Solid: Direct connection</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '20px',
              height: '3px',
              backgroundImage: 'repeating-linear-gradient(to right, #666 0px, #666 4px, transparent 4px, transparent 8px)',
              marginRight: '8px'
            }}></div>
            <span>Dashed: Private IPs in between</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TracerouteMap;
