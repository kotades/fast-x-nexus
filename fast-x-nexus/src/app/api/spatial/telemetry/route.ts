import { NextResponse } from 'next/server';
import { updateRiderLocation } from '@/app/actions/rider';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Latitude and longitude must be numbers.' },
        { status: 400 }
      );
    }

    const result = await updateRiderLocation(latitude, longitude);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.error.includes('Unauthorized') || result.error.includes('required') ? 401 : 400 }
      );
    }

    return NextResponse.json({ success: true, data: result.data }, { status: 200 });
  } catch (error: any) {
    console.error('[Telemetry Route] Ingestion error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
