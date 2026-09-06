'use client';

/**
 * ProfilePage — Profile view orchestrator
 *
 * Fetches profile data from the server action, manages edit state,
 * and renders AvatarSection, ProfileCard, AccountStatusCard.
 * Hooked directly into Supabase server actions and user authentication session.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AvatarSection } from './AvatarSection';
import { ProfileCard } from './ProfileCard';
import { AccountStatusCard } from './AccountStatusCard';
import { Button } from '@/components/customer/ui/Button';
import { Skeleton } from '@/components/customer/shared/Skeleton';
import { getUserProfile, updateUserProfile } from '@/app/actions/profile';
import { createBrowserClient } from '@/lib/supabase/client';

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  activeStatus: boolean;
  memberSince: string;
  whatsappContact: string;
  whatsappVerified: boolean;
  preferredPickupAddress: string;
}

function getInitials(name: string): string {
  if (!name || !name.trim()) return 'FX';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Client-side memory cache for instantaneous profile tab switching
let memoryProfileCache: ProfileData | null = null;

export function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(() => memoryProfileCache);
  const [initialProfile, setInitialProfile] = useState<ProfileData | null>(() => memoryProfileCache);
  const [isLoading, setIsLoading] = useState(() => memoryProfileCache === null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const supabase = createBrowserClient();

  useEffect(() => {
    async function loadData() {
      try {
        if (memoryProfileCache === null) {
          setIsLoading(true);
        }
        // Get user details
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          if (memoryProfileCache === null) {
            setErrorMessage('Failed to load user session.');
          }
          return;
        }

        // Get database profile (served instantly from Redis)
        const res = await getUserProfile();
        if (!res.success) {
          if (memoryProfileCache === null) {
            setErrorMessage(res.error);
          }
          return;
        }

        const dbProfile = res.data;
        const fullName = (dbProfile.metadata?.full_name as string) || '';
        const preferredPickupAddress = (dbProfile.metadata?.preferred_pickup_address as string) || '';
        const email = user.email || '';
        const phone = user.phone || '';
        const role = dbProfile.role || 'customer';
        const activeStatus = dbProfile.active_status ?? true;
        const whatsappContact = dbProfile.whatsapp_contact || '';
        const whatsappVerified = dbProfile.whatsapp_verified || false;

        const data: ProfileData = {
          fullName,
          email,
          phone,
          role,
          activeStatus,
          memberSince: user.created_at 
            ? new Date(user.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })
            : 'N/A',
          whatsappContact,
          whatsappVerified,
          preferredPickupAddress,
        };

        memoryProfileCache = data;
        setProfile(data);
        setInitialProfile(data);
        setErrorMessage(null);
      } catch (err: any) {
        if (memoryProfileCache === null) {
          setErrorMessage(err.message || 'An unexpected error occurred.');
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [supabase]);

  const handleFieldChange = (field: string, value: string) => {
    setProfile((prev) => prev ? { ...prev, [field]: value } : null);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    setIsSaving(true);
    setErrorMessage(null);

    const res = await updateUserProfile({
      fullName: profile.fullName,
      whatsappContact: profile.whatsappContact || undefined,
      preferredPickupAddress: profile.preferredPickupAddress,
    });

    if (res.success) {
      memoryProfileCache = profile;
      setInitialProfile(profile);
      setHasChanges(false);

      // Notify other parts of the application (like Sidebar) of profile update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('fastx:profile_updated', {
            detail: {
              fullName: profile.fullName,
              preferredPickupAddress: profile.preferredPickupAddress,
              whatsappContact: profile.whatsappContact,
            },
          })
        );
      }
    } else {
      setErrorMessage(res.error);
    }
    setIsSaving(false);
  };

  const handleCancel = () => {
    if (initialProfile) {
      setProfile(initialProfile);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 md:px-6 space-y-6">
        <div className="space-y-2">
          <Skeleton variant="text" width={100} height={12} />
          <Skeleton variant="text" width={200} height={28} />
          <Skeleton variant="text" width={300} height={16} />
        </div>
        <div className="flex justify-center py-4">
          <Skeleton variant="text" width={96} height={96} className="rounded-full" />
        </div>
        <Skeleton variant="card" height={180} />
        <Skeleton variant="card" height={180} />
      </div>
    );
  }

  if (errorMessage || !profile) {
    return (
      <div className="max-w-3xl mx-auto py-16 px-4 md:px-6 text-center">
        <span className="material-symbols-outlined text-error text-5xl mb-4" aria-hidden="true">error</span>
        <p className="text-lg font-bold text-text">Failed to load profile</p>
        <p className="text-sm text-text-muted mt-1">{errorMessage || 'Could not load your user profile.'}</p>
        <Button className="mt-6" onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl mx-auto py-8 px-4 md:px-6"
    >
      {/* Page Header */}
      <div className="mb-8">
        <p className="text-[10px] font-mono font-black uppercase tracking-[0.25em] text-text-dim mb-2">
          Settings / Profile
        </p>
        <h1 className="text-2xl font-black text-text tracking-tight">Profile</h1>
        <p className="text-sm text-text-muted mt-1">
          Manage your personal information and account settings.
        </p>
      </div>

      {/* Avatar Section */}
      <div className="mb-8 flex justify-center">
        <AvatarSection initials={getInitials(profile.fullName)} name={profile.fullName} />
      </div>

      {/* Personal Information Card */}
      <div className="mb-6">
        <ProfileCard
          fullName={profile.fullName}
          email={profile.email}
          phone={profile.phone}
          whatsappContact={profile.whatsappContact}
          preferredPickupAddress={profile.preferredPickupAddress || ''}
          onFieldChange={handleFieldChange}
        />
      </div>

      {/* Account Status Card */}
      <div className="mb-8">
        <AccountStatusCard
          role={profile.role}
          activeStatus={profile.activeStatus}
          memberSince={profile.memberSince}
          whatsappContact={profile.whatsappContact}
          whatsappVerified={profile.whatsappVerified}
        />
      </div>

      {/* Action Buttons */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end gap-4 pt-4 border-t border-border"
        >
          <Button variant="ghost" size="md" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            icon={isSaving ? undefined : 'check'}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
}