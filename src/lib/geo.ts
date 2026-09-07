export interface RiderLocation {
  lat: number;
  lng: number;
  /** m/s */
  speed: number;
  /** epoch ms */
  ts: number;
}

const EARTH_RADIUS_M = 6371000;

/** 두 좌표 간 직선거리(m). Haversine. */
export function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(s));
}

export function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export function formatSpeed(mps: number): string {
  return `${Math.max(0, mps * 3.6).toFixed(0)}km/h`;
}
