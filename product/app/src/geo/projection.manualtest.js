import {
  projectLonLat,
  unprojectXY,
  clampLatitude,
  MAX_LAT,
} from "./projection.js";

function approxEqual(a, b, eps = 1e-6) {
  return Math.abs(a - b) < eps;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testRoundTrip(lon, lat) {
  const projected = projectLonLat(lon, lat);
  const unprojected = unprojectXY(projected.x, projected.y);

  assert(
    approxEqual(unprojected.lon, lon),
    `Longitude round-trip failed: expected ${lon}, got ${unprojected.lon}`
  );

  assert(
    approxEqual(unprojected.lat, clampLatitude(lat)),
    `Latitude round-trip failed: expected ${clampLatitude(lat)}, got ${unprojected.lat}`
  );
}

function runTests() {
  // Round-trip tests
  testRoundTrip(28.1017725, -15.670478);
  testRoundTrip(0, 0);
  testRoundTrip(-0.1278, 51.5074);
  testRoundTrip(36.8219, -1.2921);

  // Clamp tests
  assert(
    approxEqual(clampLatitude(90), MAX_LAT),
    `Clamp failed for 90: expected ${MAX_LAT}, got ${clampLatitude(90)}`
  );

  assert(
    approxEqual(clampLatitude(-90), -MAX_LAT),
    `Clamp failed for -90: expected ${-MAX_LAT}, got ${clampLatitude(-90)}`
  );

  assert(
    clampLatitude(45) === 45,
    `Clamp changed valid latitude: expected 45, got ${clampLatitude(45)}`
  );

  console.log("All projection tests passed.");
}

runTests();