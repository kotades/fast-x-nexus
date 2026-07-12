-- ============================================================================
-- Migration: Core Logistics Tables & Order Lifecycle State Machine (FSM)
-- File: 20260608120000_core_logistics_and_fsm.sql
-- ============================================================================

-- Clean up existing tables to ensure a clean compilation
DROP TABLE IF EXISTS public.rider_transactions CASCADE;
DROP TABLE IF EXISTS public.parcels CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TYPE IF EXISTS public.order_status CASCADE;

-- 1. HELPERS FOR RLS
-- Security definer helper to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'::public.user_role
  );
$$;

-- 2. SCHEMA DEFINITIONS

-- Table public.orders
CREATE TABLE public.orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    rider_id        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'PLACED',
    pickup_h3_cell  TEXT NOT NULL,
    dropoff_h3_cell TEXT NOT NULL,
    total_amount    NUMERIC NOT NULL CHECK (total_amount >= 0),
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    
    -- Text check constraint for rigid OrderStatus state values
    CONSTRAINT check_order_status CHECK (
        status IN ('PLACED', 'PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED')
    )
);

-- Indexes for performance and foreign keys
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_rider_id ON public.orders(rider_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- Table public.parcels
CREATE TABLE public.parcels (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id       UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    weight         NUMERIC NOT NULL CHECK (weight >= 0),
    dimensions     TEXT, -- e.g. "30x20x15 cm"
    description    TEXT NOT NULL,
    declared_value NUMERIC NOT NULL CHECK (declared_value >= 0)
);

CREATE INDEX IF NOT EXISTS idx_parcels_order_id ON public.parcels(order_id);

-- Table public.rider_transactions
CREATE TABLE public.rider_transactions (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rider_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    order_id  UUID NOT NULL REFERENCES public.orders(id) ON DELETE RESTRICT,
    amount    NUMERIC NOT NULL CHECK (amount >= 0),
    type      TEXT NOT NULL CHECK (type IN ('earning', 'payout')),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rider_tx_rider_id ON public.rider_transactions(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_tx_order_id ON public.rider_transactions(order_id);


-- 3. LIFECYCLE STATE MACHINE (FSM Engine)

CREATE OR REPLACE FUNCTION public.process_order_state_transition(
    target_order_id UUID,
    next_status TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order       RECORD;
    v_updated_row JSONB;
BEGIN
    -- 1. Fetch current order state
    SELECT * INTO v_order FROM public.orders WHERE id = target_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order with ID % not found.', target_order_id;
    END IF;

    -- 2. Validate input status
    IF next_status NOT IN ('PLACED', 'PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED') THEN
        RAISE EXCEPTION 'Invalid target status: %', next_status;
    END IF;

    -- 3. Enforce Finite State Machine transition rules
    CASE v_order.status
        WHEN 'PLACED' THEN
            IF next_status NOT IN ('PAID_UNASSIGNED', 'CANCELLED') THEN
                RAISE EXCEPTION 'Illegal state transition: PLACED cannot advance to %', next_status;
            END IF;
            
        WHEN 'PAID_UNASSIGNED' THEN
            IF next_status != 'ASSIGNED' AND next_status != 'CANCELLED' THEN
                RAISE EXCEPTION 'Illegal state transition: PAID_UNASSIGNED cannot advance to %', next_status;
            END IF;
            
            -- Guard: reject transition to ASSIGNED if no rider has been assigned yet
            IF next_status = 'ASSIGNED' AND v_order.rider_id IS NULL THEN
                RAISE EXCEPTION 'Illegal state transition: Cannot set status to ASSIGNED while rider_id is NULL.';
            END IF;
            
        WHEN 'ASSIGNED' THEN
            IF next_status != 'PICKED_UP' AND next_status != 'CANCELLED' THEN
                RAISE EXCEPTION 'Illegal state transition: ASSIGNED cannot advance to %', next_status;
            END IF;
            
        WHEN 'PICKED_UP' THEN
            IF next_status != 'DELIVERED' THEN
                RAISE EXCEPTION 'Illegal state transition: PICKED_UP cannot advance to %', next_status;
            END IF;
            
        WHEN 'DELIVERED' THEN
            RAISE EXCEPTION 'Order is already in a final state: DELIVERED. No transitions allowed.';
            
        WHEN 'CANCELLED' THEN
            RAISE EXCEPTION 'Order is already in a final state: CANCELLED. No transitions allowed.';
            
        ELSE
            RAISE EXCEPTION 'Unknown current order status: %', v_order.status;
    END CASE;

    -- 4. Execute the update
    UPDATE public.orders
    SET status = next_status
    WHERE id = target_order_id;

    -- 5. Return the updated row
    SELECT row_to_json(o)::jsonb INTO v_updated_row 
    FROM public.orders o 
    WHERE o.id = target_order_id;

    RETURN v_updated_row;
END;
$$;


-- 4. ROW-LEVEL SECURITY (RLS) POLICIES

-- Enable RLS across all tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rider_transactions ENABLE ROW LEVEL SECURITY;

-- A. Policies for public.orders
CREATE POLICY "Customers can manage their own orders" ON public.orders
    FOR ALL
    TO authenticated
    USING (customer_id = auth.uid())
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Riders can view pool or assigned jobs" ON public.orders
    FOR SELECT
    TO authenticated
    USING (status = 'PAID_UNASSIGNED' OR rider_id = auth.uid());

CREATE POLICY "Admins have full access on orders" ON public.orders
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- B. Policies for public.parcels
CREATE POLICY "Users can access parcels of orders they can view" ON public.parcels
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = parcels.order_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = parcels.order_id
        )
    );

-- C. Policies for public.rider_transactions
CREATE POLICY "Riders can view their own transactions" ON public.rider_transactions
    FOR SELECT
    TO authenticated
    USING (rider_id = auth.uid());

CREATE POLICY "Admins have full access on rider transactions" ON public.rider_transactions
    FOR ALL
    TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- Grants
GRANT EXECUTE ON FUNCTION public.process_order_state_transition(UUID, TEXT) TO authenticated;


-- ============================================================================
-- VERIFICATION UNIT TRACE RUNS (SQL Scratchpad)
-- ============================================================================
/*
-- 1. Insert dummy profiles for testing (adjust UUIDs as needed)
-- INSERT INTO public.profiles (id, role, whatsapp_contact) 
-- VALUES 
--   ('11111111-1111-1111-1111-111111111111', 'customer', '+2348011111111'),
--   ('22222222-2222-2222-2222-222222222222', 'rider', '+2348022222222');

-- 2. Insert baseline PLACED order
-- INSERT INTO public.orders (id, customer_id, pickup_h3_cell, dropoff_h3_cell, total_amount)
-- VALUES ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '8924300aa4bffff', '8924300aa4b0000', 5000);

-- 3. Attempt illegal status skip (PLACED -> DELIVERED)
-- Expected Result: Exception "Illegal state transition: PLACED cannot advance to DELIVERED"
-- SELECT public.process_order_state_transition('99999999-9999-9999-9999-999999999999', 'DELIVERED');

-- 4. Advance to PAID_UNASSIGNED cleanly
-- SELECT public.process_order_state_transition('99999999-9999-9999-9999-999999999999', 'PAID_UNASSIGNED');

-- 5. Attempt transition to ASSIGNED while rider_id is NULL
-- Expected Result: Exception "Illegal state transition: Cannot set status to ASSIGNED while rider_id is NULL."
-- SELECT public.process_order_state_transition('99999999-9999-9999-9999-999999999999', 'ASSIGNED');

-- 6. Assign the rider
-- UPDATE public.orders SET rider_id = '22222222-2222-2222-2222-222222222222' WHERE id = '99999999-9999-9999-9999-999999999999';

-- 7. Advance to ASSIGNED cleanly
-- SELECT public.process_order_state_transition('99999999-9999-9999-9999-999999999999', 'ASSIGNED');
*/
