-- ============================================================================
-- Migration: Rider Update Policy for Orders
-- File: 20260608130100_rider_orders_policy.sql
-- ============================================================================

-- Drop policy if it already exists
DROP POLICY IF EXISTS "Riders can update assigned or open orders" ON public.orders;

-- Allow riders to claim open orders or update their assigned orders
CREATE POLICY "Riders can update assigned or open orders" ON public.orders
    FOR UPDATE
    TO authenticated
    USING (status = 'PAID_UNASSIGNED' OR rider_id = auth.uid())
    WITH CHECK (rider_id = auth.uid());
