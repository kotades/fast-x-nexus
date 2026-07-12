-- ============================================================================
-- Migration: Rider Geolocation Tracking & Spatial Matching
-- File: 20260608130000_rider_locations_and_matching.sql
-- ============================================================================

-- Clean up existing table/function if they exist
DROP FUNCTION IF EXISTS public.get_nearby_active_riders(TEXT[]);
DROP TABLE IF EXISTS public.rider_locations CASCADE;

-- 1. SCHEMA DEFINITIONS
CREATE TABLE public.rider_locations (
    rider_id   UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    latitude   NUMERIC NOT NULL,
    longitude  NUMERIC NOT NULL,
    h3_cell    TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index on h3_cell for fast index-backed array matching
CREATE INDEX IF NOT EXISTS idx_rider_locations_h3_cell ON public.rider_locations(h3_cell);

-- Index on updated_at for filtering active telemetry
CREATE INDEX IF NOT EXISTS idx_rider_locations_updated_at ON public.rider_locations(updated_at);


-- 2. ROW-LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.rider_locations ENABLE ROW LEVEL SECURITY;

-- Allow riders to manage (select, insert, update, delete) their own coordinates
CREATE POLICY "Riders can manage own location" ON public.rider_locations
    FOR ALL
    TO authenticated
    USING (rider_id = auth.uid())
    WITH CHECK (rider_id = auth.uid());

-- Allow authenticated users (customers tracking packages, admins, or other riders) to view locations
CREATE POLICY "Authenticated users can view rider locations" ON public.rider_locations
    FOR SELECT
    TO authenticated
    USING (true);


-- 3. THE MATCHING RPC FUNCTION
CREATE OR REPLACE FUNCTION public.get_nearby_active_riders(
    p_h3_cells TEXT[]
)
RETURNS TABLE (
    rider_id   UUID,
    latitude   NUMERIC,
    longitude  NUMERIC,
    h3_cell    TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        rl.rider_id, 
        rl.latitude, 
        rl.longitude, 
        rl.h3_cell, 
        rl.updated_at
    FROM public.rider_locations rl
    WHERE rl.h3_cell = ANY(p_h3_cells)
      AND rl.updated_at >= (now() - INTERVAL '15 minutes');
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_nearby_active_riders(TEXT[]) TO authenticated;
