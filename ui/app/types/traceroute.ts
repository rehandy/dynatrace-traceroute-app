export interface TracerouteHop {
  hop: number;
  ip: string;
  hostname: string;
  rtt: number[];
  location?: GeoLocation | null;
  isPublic: boolean;
}

export interface GeoLocation {
  lat: number;
  lon: number;
  city: string;
  region: string;
  country: string;
  countryCode: string;
  isp: string;
  org: string;
  as: string;
  query: string;
}

export interface TracerouteResult {
  target: string;
  hops: TracerouteHop[];
  status: 'pending' | 'running' | 'completed' | 'error';
  startTime: number;
  endTime?: number;
  error?: string;
}

export interface TracerouteRequest {
  target: string;
  maxHops?: number;
  timeout?: number;
}
