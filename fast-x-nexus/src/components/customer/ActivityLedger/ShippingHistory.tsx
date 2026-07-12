'use client';

/**
 * ShippingHistory — List of ExpandableCards
 *
 * Displays shipment history with skeleton loading and empty state.
 * Hooks into the getCustomerOrders server action for real database synchronization.
 */

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/customer/shared/Skeleton';
import { EmptyState } from '@/components/customer/shared/EmptyState';
import { ExpandableCard } from './ExpandableCard';
import { getCustomerOrders } from '@/app/actions/profile';
import type { Shipment } from '@/components/customer/contexts/CustomerDashboardContext';

export function ShippingHistory() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadShipments() {
      try {
        setIsLoading(true);
        const res = await getCustomerOrders();
        
        if (res.success) {
          const progressMap: Record<string, number> = {
            'PLACED': 10,
            'PAID_UNASSIGNED': 20,
            'ASSIGNED': 40,
            'PICKED_UP': 70,
            'DELIVERED': 100,
            'CANCELLED': 0
          };

          const mapped: Shipment[] = res.data.map((order: any) => ({
            id: order.id,
            trackingCode: `FX-${order.id.split('-')[0].toUpperCase()}`,
            status: order.status,
            origin: `Hub ${order.pickupH3Cell.slice(-6).toUpperCase()}`,
            destination: `Facility ${order.dropoffH3Cell.slice(-6).toUpperCase()}`,
            eta: order.status === 'DELIVERED' ? undefined : 'Pending',
            progress: progressMap[order.status as string] || 0,
            weight: order.weight,
            cargoSpec: order.description,
            amount: order.totalAmount,
            createdAt: order.createdAt,
            pickupH3Cell: order.pickupH3Cell,
            dropoffH3Cell: order.dropoffH3Cell,
            riderId: order.riderId
          }));

          setShipments(mapped);
        } else {
          setError(res.error);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred.');
      } finally {
        setIsLoading(false);
      }
    }

    loadShipments();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton variant="card" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-text-muted">
        <span className="material-symbols-outlined text-error text-4xl mb-4" aria-hidden="true">error</span>
        <p className="text-lg font-semibold">Failed to load shipments</p>
        <p className="text-sm mt-2">{error}</p>
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
        onAction={() => {}}
      />
    );
  }

  return (
    <div className="space-y-3">
      {shipments.map((shipment) => (
        <ExpandableCard key={shipment.id} shipment={shipment} />
      ))}
    </div>
  );
}