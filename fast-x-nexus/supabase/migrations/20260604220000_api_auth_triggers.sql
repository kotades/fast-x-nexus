-- Migration: Auth Triggers and API RPCs

-- 1. Auth Trigger: Automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, active_status)
  VALUES (new.id, 'customer'::public.user_role, true);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Atomic Booking RPC
-- This function wraps the creation of an order and its initial ledger deposit in a single transaction.
CREATE OR REPLACE FUNCTION public.create_order_with_ledger(
    p_sender_id UUID,
    p_pickup_h3 TEXT,
    p_metadata JSONB,
    p_amount DECIMAL
)
RETURNS UUID AS $$
DECLARE
    new_order_id UUID;
BEGIN
    -- Insert the order
    INSERT INTO public.orders (sender_id, pickup_h3, metadata, status)
    VALUES (p_sender_id, p_pickup_h3, p_metadata, 'placed'::public.order_status)
    RETURNING id INTO new_order_id;

    -- Insert the initial ledger entry (deposit)
    INSERT INTO public.ledgers (order_id, credit, entry_type)
    VALUES (new_order_id, p_amount, 'deposit');

    RETURN new_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
