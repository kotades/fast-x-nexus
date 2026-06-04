-- Migration: Core Nexus Schema Design
-- Enforces Types, Tables, JSONB/H3 Indexes, RLS, and Strict FSM Transitions

-- 1. DEFINITIONS (Types & Enums)
CREATE TYPE public.user_role AS ENUM ('admin', 'vendor', 'rider', 'customer');
CREATE TYPE public.order_status AS ENUM ('placed', 'unassigned', 'accepted', 'picked_up', 'in_transit', 'delivered', 'failed');

-- 2. CORE TABLES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.user_role NOT NULL DEFAULT 'customer'::public.user_role,
    whatsapp_contact TEXT,
    whatsapp_verified BOOLEAN NOT NULL DEFAULT false,
    banking_details_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    active_status BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status public.order_status NOT NULL DEFAULT 'placed'::public.order_status,
    sender_id UUID NOT NULL REFERENCES public.profiles(id),
    rider_id UUID REFERENCES public.profiles(id),
    pickup_h3 TEXT,
    cod_flag BOOLEAN NOT NULL DEFAULT false,
    payment_ref TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id),
    debit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    entry_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. INDEXING
CREATE INDEX idx_orders_pickup_h3 ON public.orders USING btree(pickup_h3);
CREATE INDEX idx_profiles_metadata ON public.profiles USING gin(metadata);
CREATE INDEX idx_orders_metadata ON public.orders USING gin(metadata);

-- 4. LOGICAL CONSTRAINTS (Triggers)

-- A. Order FSM (Forward-Only State Machine)
CREATE OR REPLACE FUNCTION public.check_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    -- No change in status
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    -- 'failed' is a valid emergency exit from any state
    IF NEW.status = 'failed' THEN
        RETURN NEW;
    END IF;

    -- Strict forward-only transition matrix
    IF OLD.status = 'placed' AND NEW.status = 'unassigned' THEN
        RETURN NEW;
    ELSIF OLD.status = 'unassigned' AND NEW.status = 'accepted' THEN
        RETURN NEW;
    ELSIF OLD.status = 'accepted' AND NEW.status = 'picked_up' THEN
        RETURN NEW;
    ELSIF OLD.status = 'picked_up' AND NEW.status = 'in_transit' THEN
        RETURN NEW;
    ELSIF OLD.status = 'in_transit' AND NEW.status = 'delivered' THEN
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Nexus Policy Violation: Invalid order status transition from % to %', OLD.status, NEW.status;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER order_status_transition_trigger
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.check_order_status_transition();

-- B. Append-Only Ledger Constraint
CREATE OR REPLACE FUNCTION public.prevent_ledger_updates()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Nexus Policy Violation: Updates and deletions are strictly prohibited on the ledgers table.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_append_only_trigger
BEFORE UPDATE OR DELETE ON public.ledgers
FOR EACH ROW
EXECUTE FUNCTION public.prevent_ledger_updates();

-- 5. ROW LEVEL SECURITY (RLS)

-- Schema separation for elevated admin lookups (prevents infinite recursion in RLS)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'::public.user_role
  );
$$;

-- Secure the admin lookup function
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledgers ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Admins have full access to profiles" ON public.profiles FOR ALL TO authenticated
USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Orders Policies
CREATE POLICY "Admins have full access to orders" ON public.orders FOR ALL TO authenticated
USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Senders can view their own orders" ON public.orders FOR SELECT TO authenticated
USING (sender_id = auth.uid());

CREATE POLICY "Riders can view unassigned orders or their assigned orders" ON public.orders FOR SELECT TO authenticated
USING (status = 'unassigned'::public.order_status OR rider_id = auth.uid());

CREATE POLICY "Riders can update unassigned or assigned orders" ON public.orders FOR UPDATE TO authenticated
USING (status = 'unassigned'::public.order_status OR rider_id = auth.uid()) 
WITH CHECK (rider_id = auth.uid());

-- Ledgers Policies
CREATE POLICY "Admins have full access to ledgers" ON public.ledgers FOR ALL TO authenticated
USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Users can view ledgers linked to their active orders" ON public.ledgers FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = public.ledgers.order_id
    AND (o.sender_id = auth.uid() OR o.rider_id = auth.uid())
  )
);
