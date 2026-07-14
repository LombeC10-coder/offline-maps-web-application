// product/app/src/geo/projection.js

// Web Mercator latitude clamp (standard for slippy maps)
export const MAX_LAT = 85.05112878;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function clampLatitude(latDeg) {
  return clamp(latDeg, -MAX_LAT, MAX_LAT);
}

/**
 * Project lon/lat (degrees) into Web Mercator world coords.
 * Output is in a consistent projected "world" space, not pixels.
 * x is longitude in radians; y is Mercator y.
 */
export function projectLonLat(lonDeg, latDeg) {
  const lat = clampLatitude(latDeg);

  const lonRad = (lonDeg * Math.PI) / 180;
  const latRad = (lat * Math.PI) / 180;

  const x = lonRad;
  const y = Math.log(Math.tan(Math.PI / 4 + latRad / 2));

  return { x, y };
}

/**
 * Reverse Web Mercator world coords back into lon/lat (degrees).
 */
export function unprojectXY(x, y) {
  const lonDeg = (x * 180) / Math.PI;
  const latRad = 2 * Math.atan(Math.exp(y)) - Math.PI / 2;
  const latDeg = (latRad * 180) / Math.PI;

  return { lon: lonDeg, lat: latDeg };
}