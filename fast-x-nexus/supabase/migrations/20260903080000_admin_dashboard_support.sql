-- Migration: Add metadata to orders for Admin Actions (cancellation reasons, audit logs)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
