import { latLngToCell, cellToLatLng, cellToBoundary } from 'h3-js';

/**
 * Fast X Nexus - Geolocation & Telemetry Utility
 * 
 * Provides conversions between standard GPS Coordinates and H3 Hexagon Indexes.
 * Resolution 9 is used as the standard default for neighborhood-level tracking (~0.1 km^2).
 */

const DEFAULT_H3_RESOLUTION = 9;

export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Converts a Latitude/Longitude pair into an H3 string ID.
 */
export function getH3CellFromCoords(lat: number, lng: number, resolution = DEFAULT_H3_RESOLUTION): string {
  return latLngToCell(lat, lng, resolution);
}

/**
 * Returns the center coordinates of a given H3 cell.
 */
export function getCoordsFromH3Cell(h3Cell: string): Coordinates {
  const [lat, lng] = cellToLatLng(h3Cell);
  return { lat, lng };
}

/**
 * Returns the boundary polygon (array of lat/lng pairs) for a given H3 cell.
 * Useful for Leaflet polygon drawing.
 */
export function getH3CellBoundary(h3Cell: string): Coordinates[] {
  const boundary = cellToBoundary(h3Cell);
  return boundary.map(([lat, lng]) => ({ lat, lng }));
}
