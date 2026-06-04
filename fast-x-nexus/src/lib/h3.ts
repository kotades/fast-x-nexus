/**
 * /src/lib/h3.ts
 * Fast X Nexus — Uber H3 Spatial Coordinate Wrapper
 *
 * Purpose: Maps raw latitude/longitude coordinate arrays to Uber H3 hexagonal
 * integer cells for LGA Zone Matrix computation and geospatial indexing.
 *
 * H3 Resolution Scale Reference (for Fast X):
 *   Resolution 5 (~252km² cells) → State-level grouping
 *   Resolution 7 (~5.16km² cells) → LGA-level zone identification ← PRIMARY
 *   Resolution 9 (~0.105km² cells) → Pickup/Dropoff hub precision
 *
 * Docs: https://h3geo.org/docs/api/indexing
 */

import {
  latLngToCell,
  cellToLatLng,
  gridDisk,
  getResolution,
  isValidCell,
  cellsToMultiPolygon,
  greatCircleDistance,
} from "h3-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default H3 resolution for LGA zone matrix operations */
export const LGA_RESOLUTION = 7;

/** Default H3 resolution for pickup/dropoff hub precision */
export const HUB_RESOLUTION = 9;

/** H3 resolution for state-level grouping */
export const STATE_RESOLUTION = 5;

// ---------------------------------------------------------------------------
// Core Coordinate Types
// ---------------------------------------------------------------------------

export interface LatLng {
  lat: number;
  lng: number;
}

export interface H3ZoneResult {
  h3Index: string;
  resolution: number;
  center: LatLng;
  isValid: boolean;
}

// ---------------------------------------------------------------------------
// Core Wrapper Functions
// ---------------------------------------------------------------------------

/**
 * Converts a lat/lng coordinate pair to an H3 cell index.
 * Used to map pickup/dropoff addresses to their LGA zone cells.
 *
 * @param lat - Latitude of the coordinate
 * @param lng - Longitude of the coordinate
 * @param resolution - H3 resolution (default: LGA_RESOLUTION = 7)
 * @returns H3ZoneResult with index and metadata
 */
export function coordinateToH3Zone(
  lat: number,
  lng: number,
  resolution: number = LGA_RESOLUTION
): H3ZoneResult {
  const h3Index = latLngToCell(lat, lng, resolution);
  const [centerLat, centerLng] = cellToLatLng(h3Index);

  return {
    h3Index,
    resolution: getResolution(h3Index),
    center: { lat: centerLat, lng: centerLng },
    isValid: isValidCell(h3Index),
  };
}

/**
 * Converts an array of coordinate pairs to H3 zone indices.
 * Batch-converts a route breadcrumb array for telemetry zone analysis.
 *
 * @param coordinates - Array of {lat, lng} coordinate objects
 * @param resolution - H3 resolution (default: LGA_RESOLUTION = 7)
 * @returns Array of H3ZoneResult objects
 */
export function coordinateArrayToH3Zones(
  coordinates: LatLng[],
  resolution: number = LGA_RESOLUTION
): H3ZoneResult[] {
  return coordinates.map(({ lat, lng }) =>
    coordinateToH3Zone(lat, lng, resolution)
  );
}

/**
 * Gets all H3 cells within a given radius (ring distance) of a center cell.
 * Used to find all riders within k-rings of a pickup zone.
 *
 * @param h3Index - Center H3 cell index
 * @param ringSize - Number of rings outward (1 ring ≈ ~1.5km at resolution 7)
 * @returns Array of neighboring H3 cell indices
 */
export function getZoneNeighbors(h3Index: string, ringSize: number): string[] {
  if (!isValidCell(h3Index)) {
    throw new Error(`Invalid H3 cell index: ${h3Index}`);
  }
  return gridDisk(h3Index, ringSize);
}

/**
 * Calculates the great-circle distance between two coordinates in kilometers.
 * Used for the 50-meter threshold check in the telemetry buffering engine.
 *
 * @param origin - Origin coordinate {lat, lng}
 * @param destination - Destination coordinate {lat, lng}
 * @returns Distance in kilometers
 */
export function calculateDistanceKm(
  origin: LatLng,
  destination: LatLng
): number {
  return greatCircleDistance(
    [origin.lat, origin.lng],
    [destination.lat, destination.lng],
    "km"
  );
}

/**
 * Checks if a coordinate has crossed the 50-meter telemetry threshold.
 * If true, the rider app should buffer and upload the new coordinate.
 *
 * @param lastUploaded - Last successfully uploaded coordinate
 * @param current - Current rider coordinate
 * @returns true if the 50m threshold has been crossed
 */
export function hasCrossedTelemetryThreshold(
  lastUploaded: LatLng,
  current: LatLng
): boolean {
  const distanceKm = calculateDistanceKm(lastUploaded, current);
  return distanceKm >= 0.05; // 50 meters = 0.05 km
}

/**
 * Converts H3 cell indices to GeoJSON MultiPolygon geometry.
 * Used by Leaflet to render LGA zone boundaries on the tracking map.
 *
 * @param h3Indices - Array of H3 cell index strings
 * @returns GeoJSON-compatible polygon coordinates
 */
export function h3ZonesToGeoJSON(
  h3Indices: string[]
): number[][][][] {
  return cellsToMultiPolygon(h3Indices, true);
}
