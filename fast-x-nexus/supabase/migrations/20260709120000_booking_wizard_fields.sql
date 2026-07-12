-- Migration to support the new Booking Engine fields

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS pickup_name text,
ADD COLUMN IF NOT EXISTS pickup_phone text,
ADD COLUMN IF NOT EXISTS pickup_address text,
ADD COLUMN IF NOT EXISTS dropoff_name text,
ADD COLUMN IF NOT EXISTS dropoff_phone text,
ADD COLUMN IF NOT EXISTS dropoff_address text,
ADD COLUMN IF NOT EXISTS preferred_delivery_time timestamp with time zone;
