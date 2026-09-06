'use server';

/**
 * /src/app/actions/riderRegistration.ts
 * Fast X Nexus — Enterprise Rider Onboarding & Account Creation
 *
 * Supports:
 * 1. Creating a brand new Rider account directly (Email + Password + Fleet metadata)
 * 2. Promoting an existing authenticated user to 'rider' role
 * 3. Initializing spatial driver coordinates in chosen coverage hub
 */

import { z } from 'zod';
import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from './booking';

const RiderRegistrationSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Valid email address required').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  whatsappPhone: z.string().min(10, 'Valid WhatsApp phone number required'),
  vehicleType: z.enum(['motorcycle', 'bicycle', 'van', 'car']),
  vehiclePlate: z.string().optional(),
  coverageZone: z.string().min(2, 'Coverage zone is required'),
  driverLicenseNumber: z.string().optional(),
});

export type RiderRegistrationInput = z.infer<typeof RiderRegistrationSchema>;

export async function registerRiderAction(
  input: RiderRegistrationInput
): Promise<ActionResult<{ userId: string; redirectUrl: string }>> {
  try {
    const parsed = RiderRegistrationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues.map((i) => i.message).join(', '),
      };
    }

    const {
      fullName,
      email,
      password,
      whatsappPhone,
      vehicleType,
      vehiclePlate,
      coverageZone,
      driverLicenseNumber,
    } = parsed.data;

    const supabase = await createServerClient();
    const adminClient = await createAdminClient();

    let targetUserId: string | null = null;

    // Check if user is currently signed in
    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();

    if (currentUser) {
      targetUserId = currentUser.id;
    } else if (email && password) {
      // 1. Try creating user
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: 'rider',
        },
      });

      if (created?.user) {
        targetUserId = created.user.id;
        // Establish browser session cookie
        await supabase.auth.signInWithPassword({
          email,
          password,
        });
      } else if (createError && (createError.message.includes('already') || createError.message.includes('exists'))) {
        // User already exists, try signing in
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInErr || !signInData?.user) {
          return {
            success: false,
            error: `An account already exists with ${email}. Please ensure your password is correct, or log in first.`,
          };
        }
        targetUserId = signInData.user.id;
      } else {
        return {
          success: false,
          error: createError?.message || 'Failed to create rider account.',
        };
      }
    } else {
      return {
        success: false,
        error: 'Please provide your Email and Password to create your rider account.',
      };
    }

    // Format phone to international E.164
    const cleanPhone = whatsappPhone.replace(/\s+/g, '');
    const formattedPhone = cleanPhone.startsWith('+')
      ? cleanPhone
      : cleanPhone.startsWith('0')
      ? `+234${cleanPhone.slice(1)}`
      : `+${cleanPhone}`;

    // 3. Upsert profile with 'rider' role
    const updatedMetadata = {
      full_name: fullName,
      vehicle_type: vehicleType,
      vehicle_plate: vehiclePlate || 'N/A',
      coverage_zone: coverageZone,
      driver_license_number: driverLicenseNumber || 'N/A',
      onboarded_at: new Date().toISOString(),
    };

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: targetUserId,
          role: 'rider',
          whatsapp_contact: formattedPhone,
          whatsapp_verified: true,
          active_status: true,
          metadata: updatedMetadata,
        },
        { onConflict: 'id' }
      );

    if (profileUpdateError) {
      console.error('[registerRiderAction] Profile update failed:', profileUpdateError);
      return { success: false, error: 'Failed to update rider profile. Please try again.' };
    }

    // 4. Initialize default spatial location in chosen zone
    const zoneCoordsMap: Record<string, { lat: number; lng: number; h3Cell: string }> = {
      ikorodu: { lat: 6.6191, lng: 3.5041, h3Cell: '8924300aa4bffff' },
      mainland: { lat: 6.5244, lng: 3.3792, h3Cell: '8924300aa4bffff' },
      island: { lat: 6.4281, lng: 3.4219, h3Cell: '8924300aa4bffff' },
      delta: { lat: 5.5644, lng: 5.8450, h3Cell: '8982db2d417ffff' },
      abuja: { lat: 9.0579, lng: 7.4951, h3Cell: '8924300aa4bffff' },
    };

    const zoneKey = coverageZone.toLowerCase();
    const matchedCoords = zoneCoordsMap[zoneKey] || zoneCoordsMap.ikorodu;

    await adminClient
      .from('rider_locations')
      .upsert(
        {
          rider_id: targetUserId,
          latitude: matchedCoords.lat,
          longitude: matchedCoords.lng,
          h3_cell: matchedCoords.h3Cell,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'rider_id' }
      );

    revalidatePath('/', 'layout');
    revalidatePath('/rider');
    revalidatePath('/customer');

    return {
      success: true,
      data: {
        userId: targetUserId,
        redirectUrl: '/rider',
      },
    };
  } catch (err: any) {
    console.error('[registerRiderAction] Error:', err);
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
