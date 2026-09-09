/**
 * /src/lib/dispatch/types.ts
 * Fast X Nexus — Dispatch & Orchestration Engine Types
 *
 * Modeled after Fleetbase FleetOps Orchestrator Workbench.
 */

export type WaypointType = 'pickup' | 'dropoff' | 'return' | 'hub_transfer';

export interface Waypoint {
  id?: string;
  type: WaypointType;
  address: string;
  lat: number;
  lng: number;
  h3Cell: string;
  contactName?: string;
  contactPhone?: string;
  scheduledAt?: string;
  estimatedArrival?: string;
  notes?: string;
}

export interface CargoEntity {
  id?: string;
  description: string;
  weightKg: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  declaredValueNgn: number;
  isFragile?: boolean;
  requiresCooling?: boolean;
}

export interface OrchestrationOrder {
  id: string;
  trackingNumber: string;
  status: 'PLACED' | 'PAID_UNASSIGNED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  priority: number; // 0 (normal) to 10 (emergency / express)
  pickup: Waypoint;
  dropoff: Waypoint;
  entities: CargoEntity[];
  totalAmountNgn: number;
  createdAt: string;
  scheduledAt?: string;
  customerPhone?: string;
  deliveryPin?: string;
}

export interface DriverCandidate {
  id: string; // rider_id
  userId: string;
  name: string;
  phone: string;
  avatarUrl?: string;
  vehicleType: 'bicycle' | 'motorcycle' | 'van' | 'truck';
  isOnline: boolean;
  currentLat?: number;
  currentLng?: number;
  currentH3Cell?: string;
  assignedOrdersCount: number;
  maxCapacityKg: number;
  rating: number; // 1.0 to 5.0
  speedKmh?: number;
  heading?: number;
}

export interface AllocationResult {
  orderId: string;
  riderId: string;
  riderName: string;
  distanceMeters: number;
  estimatedPickupMinutes: number;
  h3Distance: number;
  algorithm: 'greedy_h3' | 'vroom_vrp' | 'manual_override';
  allocatedAt: string;
}

export interface UnassignedResult {
  orderId: string;
  reason: 'no_riders_in_radius' | 'capacity_exceeded' | 'all_riders_busy' | 'invalid_coordinates';
}

export interface OrchestrationRunResult {
  runId: string;
  timestamp: string;
  totalProcessed: number;
  allocatedCount: number;
  unassignedCount: number;
  assignments: AllocationResult[];
  unassigned: UnassignedResult[];
}

export interface OrchestrationOptions {
  maxRadiusH3Krings?: number; // Default 3 (~3-5km at res 8)
  allowMultiOrder?: boolean; // If true, riders can take up to max capacity
  maxOrdersPerRider?: number; // Default 3 in multi-order mode
  vehicleTypeFilter?: ('bicycle' | 'motorcycle' | 'van' | 'truck')[];
}

export interface DispatchPreviewMatch {
  orderId: string;
  trackingNumber: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupName?: string;
  dropoffName?: string;
  cargoDescription?: string;
  cargoWeightKg: number;
  totalAmountNgn: number;
  payoutNgn: number;
  createdAt: string;
  riderId: string;
  riderName: string;
  riderPhone: string;
  vehicleType: string;
  avatarUrl?: string;
  rating?: number;
  distanceKm: number;
  distanceMeters: number;
  h3Distance: number;
  estimatedPickupMinutes: number;
}

export interface DispatchPreviewUnassigned {
  orderId: string;
  trackingNumber: string;
  pickupAddress: string;
  dropoffAddress: string;
  reason: string;
  cargoWeightKg: number;
  totalAmountNgn: number;
  createdAt: string;
}

export interface DispatchPreviewResult {
  runId: string;
  timestamp: string;
  totalOrders: number;
  matchedCount: number;
  unassignedCount: number;
  totalPayoutNgn: number;
  avgDistanceKm: number;
  matches: DispatchPreviewMatch[];
  unassigned: DispatchPreviewUnassigned[];
}
