/**
 * Geo/Location Utilities
 *
 * GPS validation, distance calculations, etc.
 */

/**
 * Validate GPS coordinates
 */
export function isValidCoordinates(lat: number, lon: number): boolean {
  return (
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !isNaN(lat) &&
    !isNaN(lon)
  );
}

/**
 * Check if GPS accuracy is acceptable
 * @param accuracyM - Accuracy in meters
 * @param maxAccuracy - Maximum acceptable accuracy (default: 100m)
 */
export function isAcceptableAccuracy(
  accuracyM: number,
  maxAccuracy = 100
): boolean {
  return accuracyM > 0 && accuracyM <= maxAccuracy;
}

/**
 * Calculate distance between two GPS coordinates (Haversine formula)
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Detect if GPS coordinates might be mocked/spoofed
 * This is a basic check - real detection would require device info
 */
export function detectMockedLocation(
  lat: number,
  lon: number,
  accuracyM: number
): boolean {
  // Suspiciously high accuracy (< 1m) might indicate mocking
  if (accuracyM < 1) return true;

  // Coordinates exactly at 0,0 (Null Island) are suspicious
  if (lat === 0 && lon === 0) return true;

  // Coordinates with too many decimal places (exactly 6 or more) might be fake
  const latStr = lat.toString();
  const lonStr = lon.toString();
  const latDecimals = latStr.includes(".") ? latStr.split(".")[1].length : 0;
  const lonDecimals = lonStr.includes(".") ? lonStr.split(".")[1].length : 0;

  if (latDecimals > 10 || lonDecimals > 10) return true;

  return false;
}

/**
 * Check if location is within India
 * Rough bounding box check
 */
export function isLocationInIndia(lat: number, lon: number): boolean {
  // India bounding box (approximate)
  const indiaBounds = {
    minLat: 6.0,
    maxLat: 37.0,
    minLon: 68.0,
    maxLon: 98.0,
  };

  return (
    lat >= indiaBounds.minLat &&
    lat <= indiaBounds.maxLat &&
    lon >= indiaBounds.minLon &&
    lon <= indiaBounds.maxLon
  );
}
