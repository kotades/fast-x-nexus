import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createServerClient();
    
    // A quick, low-overhead check to verify database connectivity.
    // Querying the profiles table to see if it responds.
    const { error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[Health Check] Supabase connectivity check failed:', error);
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Database connectivity error', 
          details: error.message 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      status: 'ok', 
      database: 'connected',
      timestamp: new Date().toISOString() 
    });
  } catch (err: any) {
    console.error('[Health Check] Critical error during Supabase health check:', err);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Internal server error during health check', 
        details: err.message || err 
      },
      { status: 500 }
    );
  }
}
