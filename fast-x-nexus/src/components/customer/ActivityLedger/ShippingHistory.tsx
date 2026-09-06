'use client';

/**
 * /src/components/customer/ActivityLedger/ShippingHistory.tsx
 * Fast X Nexus — List of ExpandableCards with Instant Redis & SWR Caching
 */

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/customer/shared/Skeleton';
import { EmptyState } from '@/components/customer/shared/EmptyState';
import { ExpandableCard } from './ExpandableCard';
import { getCustomerOrders } from '@/app/actions/profile';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import type { Shipment } from '@/components/customer/contexts/CustomerDashboardContext';

// Client-side memory cache for zero-latency instantaneous tab transitions
let memoryShipmentsCache: Shipment[] | null = null;

export function ShippingHistory() {
  const [shipments, setShipments] = useState<Shipment[]>(() => memoryShipmentsCache || []);
  const [isLoading, setIsLoading] = useState(() => memoryShipmentsCache === null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { navigateTo } = useCustomerDashboard();

  const loadShipments = async (silent = false) => {
    try {
      if (!silent && memoryShipmentsCache === null) {
        setIsLoading(true);
      } else if (silent) {
        setIsRefreshing(true);
      }
      
      const res = await getCustomerOrders();

      if (res.success) {
        const progressMap: Record<string, number> = {
          'PLACED': 10,
          'PAID_UNASSIGNED': 20,
          'ASSIGNED': 40,
          'PICKED_UP': 70,
          'IN_TRANSIT': 75,
          'DELIVERED': 100,
          'CANCELLED': 0,
        };

        const mapped: Shipment[] = (res.data || []).map((order: any) => ({
          id: order.id,
          trackingCode: `FX-${order.id.slice(0, 8).toUpperCase()}`,
          status: order.status,
          origin: order.pickupAddress || `Hub ${order.pickupH3Cell?.slice(-6)?.toUpperCase() || 'N/A'}`,
          destination: order.dropoffAddress || `Facility ${order.dropoffH3Cell?.slice(-6)?.toUpperCase() || 'N/A'}`,
          eta: order.status === 'DELIVERED' ? undefined : 'Pending',
          progress: progressMap[order.status as string] || 20,
          weight: order.weight ? `${order.weight}kg` : '5kg',
          cargoSpec: order.description,
          amount: Number(order.totalAmount) || 0,
          createdAt: order.createdAt,
          pickupH3Cell: order.pickupH3Cell,
          dropoffH3Cell: order.dropoffH3Cell,
          riderId: order.riderId,
        }));

        memoryShipmentsCache = mapped;
        setShipments(mapped);
        setError(null);
      } else {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // If we have cached shipments, load silently in background (SWR); otherwise show initial load
    loadShipments(memoryShipmentsCache !== null);
  }, []);

  const handleDeleted = (id: string) => {
    setShipments((prev) => {
      const next = prev.filter((s) => s.id !== id);
      memoryShipmentsCache = next;
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="card" count={3} />
      </div>
    );
  }

  if (error && shipments.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted">
        <span className="material-symbols-outlined text-error text-4xl mb-4" aria-hidden="true">error</span>
        <p className="text-lg font-semibold">Failed to load shipments</p>
        <p className="text-sm mt-2">{error}</p>
        <button
          onClick={() => loadShipments(false)}
          className="mt-4 px-4 py-2 bg-primary text-primary-text font-bold text-xs uppercase tracking-wider rounded"
        >
          Retry
        </button>
      </div>
    );
  }

  if (shipments.length === 0) {
    return (
      <EmptyState
        icon="local_shipping"
        title="No Shipments Yet"
        description="Your shipping history will appear here once you book your first delivery."
        actionLabel="Book Your First Delivery"
        onAction={() => navigateTo('booking_wizard')}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Header — Clean & Functional */}
      <div className="flex justify-between items-center bg-surface-low border border-border p-3 font-mono text-xs">
        <span className="text-text-muted">
          Showing <strong className="text-text">{shipments.length}</strong> record{shipments.length === 1 ? '' : 's'}
        </span>
        <button
          onClick={() => loadShipments(false)}
          disabled={isRefreshing}
          className="text-primary hover:text-primary-hover flex items-center gap-1 font-semibold transition-colors cursor-pointer"
          title="Refresh shipment list from Redis cache"
        >
          <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>sync</span>
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>
      </div>

      {/* Shipments List */}
      <div className="space-y-3">
        {shipments.map((shipment) => (
          <ExpandableCard key={shipment.id} shipment={shipment} onDeleted={handleDeleted} />
        ))}
      </div>
    </div>
  );
}