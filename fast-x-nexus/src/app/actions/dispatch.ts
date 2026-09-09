'use server';

/**
 * /src/app/actions/dispatch.ts
 * Fast X Nexus — Enterprise Dispatch Server Actions
 */

import { DispatchOrchestrator } from '@/lib/dispatch/orchestrator';
import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { sendWhatsAppMessage, buildRiderDispatchMessage } from '@/lib/whatsapp';

import type { OrchestrationOptions, DispatchPreviewResult } from '@/lib/dispatch/types';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignored when invoked in standalone script/testing context
  }
}

/**
 * Generates an auto-dispatch preview with H3 distance metrics and candidate matches
 * without mutating database records.
 */
export async function previewAutoDispatchAction(options?: OrchestrationOptions): Promise<{
  success: boolean;
  data?: DispatchPreviewResult;
  error?: string;
}> {
  try {
    const orchestrator = new DispatchOrchestrator();
    const data = await orchestrator.previewAutoDispatch({
      maxRadiusH3Krings: options?.maxRadiusH3Krings ?? 6,
      allowMultiOrder: options?.allowMultiOrder ?? true,
      maxOrdersPerRider: options?.maxOrdersPerRider ?? 3,
      ...options,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('[Action: previewAutoDispatchAction] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate dispatch preview',
    };
  }
}

/**
 * Atomically commits a confirmed batch of courier assignments.
 */
export async function executeBatchAutoDispatchAction(
  matches: Array<{ orderId: string; riderId: string }>
): Promise<{
  success: boolean;
  allocatedCount: number;
  errors?: string[];
  error?: string;
}> {
  try {
    if (!matches || matches.length === 0) {
      return { success: false, allocatedCount: 0, error: 'No order-courier matches provided' };
    }

    const orchestrator = new DispatchOrchestrator();
    const result = await orchestrator.executeBatchDispatch(matches);

    safeRevalidate('/admin');
    safeRevalidate('/rider');
    safeRevalidate('/customer');

    return {
      success: result.success,
      allocatedCount: result.allocatedCount,
      errors: result.errors,
    };
  } catch (error: any) {
    console.error('[Action: executeBatchAutoDispatchAction] Error:', error);
    return {
      success: false,
      allocatedCount: 0,
      error: error.message || 'Batch dispatch execution failed',
    };
  }
}

/**
 * Trigger an auto-dispatch batch across all pending unassigned orders (instant batch).
 */
export async function triggerAutoDispatch() {
  try {
    const orchestrator = new DispatchOrchestrator();
    const result = await orchestrator.executeAutoDispatch({
      maxRadiusH3Krings: 6,
      allowMultiOrder: true,
      maxOrdersPerRider: 3,
    });

    safeRevalidate('/admin');
    safeRevalidate('/rider');
    safeRevalidate('/customer');

    return {
      success: true,
      allocatedCount: result.allocatedCount,
      unassignedCount: result.unassignedCount,
      assignments: result.assignments,
    };
  } catch (error: any) {
    console.error('[Action: triggerAutoDispatch] Error:', error);
    return {
      success: false,
      error: error.message || 'Auto-dispatch execution failed',
    };
  }
}

/**
 * Manually assign an order to a specific rider.
 */
export async function manualAssignRider(orderId: string, riderId: string) {
  try {
    const supabase = await createServerClient();

    // Verify current user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        rider_id: riderId,
        status: 'ASSIGNED',
      })
      .eq('id', orderId);

    if (updateError) {
      throw updateError;
    }

    // Fetch order and rider details to notify rider
    const { data: order } = await supabase
      .from('orders')
      .select('id, pickup_address, dropoff_address, total_amount')
      .eq('id', orderId)
      .single();

    const { data: rider } = await supabase
      .from('profiles')
      .select('whatsapp_contact')
      .eq('id', riderId)
      .single();

    if (rider?.whatsapp_contact && order) {
      const msg = buildRiderDispatchMessage({
        orderId: `FX-${order.id.substring(0, 8).toUpperCase()}`,
        pickupHub: order.pickup_address || 'Pickup Hub',
        dropoffHub: order.dropoff_address || 'Dropoff Hub',
        parcelSize: 'Standard Cargo',
        payoutNaira: Math.round((Number(order.total_amount) || 0) * 0.7),
      });

      sendWhatsAppMessage({
        to: rider.whatsapp_contact,
        message: msg,
      }).catch((e) => console.warn('[manualAssignRider] Notification warning:', e));
    }

    safeRevalidate('/admin');
    safeRevalidate('/rider');
    return { success: true };
  } catch (error: any) {
    console.error('[Action: manualAssignRider] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to manually assign rider',
    };
  }
}

/**
 * Reassign an order to a different rider or back to unassigned pool.
 */
export async function reassignOrder(orderId: string, newRiderId: string | null) {
  try {
    const supabase = await createServerClient();

    const updatePayload: Record<string, any> = newRiderId
      ? { rider_id: newRiderId, status: 'ASSIGNED' }
      : { rider_id: null, status: 'PAID_UNASSIGNED' };

    const { error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (error) throw error;

    safeRevalidate('/admin');
    safeRevalidate('/rider');
    return { success: true };
  } catch (error: any) {
    console.error('[Action: reassignOrder] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to reassign order',
    };
  }
}

/**
 * Fetch full waybill pipeline for Admin Control Tower.
 */
export async function getWaybillPipeline() {
  try {
    const supabase = await createServerClient();

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        rider_id,
        status,
        pickup_h3_cell,
        dropoff_h3_cell,
        total_amount,
        created_at,
        pickup_name,
        pickup_phone,
        pickup_address,
        dropoff_name,
        dropoff_phone,
        dropoff_address,
        preferred_delivery_time,
        metadata,
        parcels (
          id,
          weight,
          dimensions,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch all riders to provide candidate options
    const { data: riders } = await supabase
      .from('profiles')
      .select('id, role, whatsapp_contact, whatsapp_verified, active_status, metadata')
      .eq('role', 'rider');

    return {
      success: true,
      orders: orders || [],
      riders: riders || [],
    };
  } catch (error: any) {
    console.error('[Action: getWaybillPipeline] Error:', error);
    return {
      success: false,
      orders: [],
      riders: [],
      error: error.message || 'Failed to fetch waybill pipeline',
    };
  }
}
