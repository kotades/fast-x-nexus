'use client';

/**
 * BookingModal — Desktop: Modal overlay | Mobile: fullscreen inline
 *
 * Wraps the BookingWizard in the existing Modal component for desktop viewports,
 * and renders inline fullscreen for mobile.
 */

import React from 'react';
import { useCustomerDashboard } from '@/components/customer/contexts/CustomerDashboardContext';
import { Modal } from '@/components/Modals/Modal';
import { BookingWizard } from './BookingWizard';

export function BookingModal() {
  const { activeView, navigateTo } = useCustomerDashboard();
  const isOpen = activeView === 'booking_wizard';

  const handleClose = () => {
    navigateTo('command_map');
  };

  // Desktop: use Modal overlay | Mobile: render inline
  return (
    <>
      {/* Desktop Modal */}
      <div className="hidden md:block">
        <Modal
          isOpen={isOpen}
          onClose={handleClose}
          roles={['customer']}
          title="New Booking"
          description="Configure your parcel and route to book a delivery."
        >
          <div className="h-[600px]">
            <BookingWizard />
          </div>
        </Modal>
      </div>

      {/* Mobile: Fullscreen inline view */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[var(--z-overlay)] bg-surface">
          <BookingWizard />
        </div>
      )}
    </>
  );
}