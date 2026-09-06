/**
 * /src/lib/geo/closestLandmarkSnapper.ts
 * Fast X Nexus — Closest Landmark Snapping & Proximity Engine
 *
 * Computes great-circle distances to snap arbitrary coordinates or street centers
 * to the nearest verified physical landmark (Bus Stop, Junction, Estate Gate, Plaza).
 */

import { NigerianLandmark } from './nigerianCommunities';

export interface SnappedLandmarkResult {
  nearestLandmark: NigerianLandmark;
  distanceMeters: number;
  formattedSnapNote: string;
}

/**
 * Calculates Haversine distance in meters between two lat/lng pairs.
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Finds the closest physical landmark from the registry within a given search radius.
 */
export function snapToNearestLandmark(
  lat: number,
  lng: number,
  candidatePool: NigerianLandmark[],
  maxRadiusMeters: number = 2500
): SnappedLandmarkResult | null {
  if (!candidatePool || candidatePool.length === 0) return null;

  let closest: NigerianLandmark | null = null;
  let minDistance = Infinity;

  for (const lm of candidatePool) {
    const dist = calculateDistanceMeters(lat, lng, lm.lat, lm.lng);
    if (dist < minDistance && dist <= maxRadiusMeters) {
      minDistance = dist;
      closest = lm;
    }
  }

  if (!closest) return null;

  const categoryIcon = closest.category === 'transit' ? '🚏' : closest.category === 'junction' ? '🛣️' : closest.category === 'estate' ? '🏢' : '📍';
  const formattedSnapNote = `${categoryIcon} Near ${closest.name} (~${minDistance}m away, ${closest.subDistrict})`;

  return {
    nearestLandmark: closest,
    distanceMeters: minDistance,
    formattedSnapNote,
  };
}
