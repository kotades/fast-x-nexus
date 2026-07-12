/**
 * /src/types/database.types.ts
 * Fast X Nexus — Database Type Definitions
 */

export type OrderStatus = 'PLACED' | 'PAID_UNASSIGNED' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
export type UserRole = 'admin' | 'vendor' | 'rider' | 'customer';
export type TransactionType = 'earning' | 'payout';

export interface Profile {
  id: string;
  role: UserRole;
  whatsapp_contact: string | null;
  whatsapp_verified: boolean;
  banking_details_json: Record<string, any> | null;
  active_status: boolean;
  metadata: Record<string, any> | null;
}

export interface Order {
  id: string;
  customer_id: string;
  rider_id: string | null;
  status: OrderStatus;
  pickup_h3_cell: string;
  dropoff_h3_cell: string;
  pickup_name?: string | null;
  pickup_phone?: string | null;
  pickup_address?: string | null;
  dropoff_name?: string | null;
  dropoff_phone?: string | null;
  dropoff_address?: string | null;
  preferred_delivery_time?: string | null;
  total_amount: number;
  created_at: string;
}

export interface Parcel {
  id: string;
  order_id: string;
  weight: number;
  dimensions: string | null;
  description: string;
  declared_value: number;
}

export interface RiderTransaction {
  id: string;
  rider_id: string;
  order_id: string;
  amount: number;
  type: TransactionType;
  timestamp: string;
}

export interface RiderLocation {
  rider_id: string;
  latitude: number;
  longitude: number;
  h3_cell: string;
  updated_at: string;
}

