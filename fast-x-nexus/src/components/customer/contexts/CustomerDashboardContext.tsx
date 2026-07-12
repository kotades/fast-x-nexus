'use client';

/**
 * CustomerDashboardContext — State-Driven UI Controller
 *
 * Manages: activeView, activeShipment, wizardStep, ledgerTab
 * Now connected to Supabase Realtime for live order tracking.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';

export type DashboardView = 'command_map' | 'booking_wizard' | 'activity_ledger' | 'profile';
export type WizardStep = 1 | 2 | 3 | 4;
export type LedgerTab = 'shipping' | 'financial';

export interface Shipment {
  id: string;
  trackingCode: string;
  status: 'PLACED' | 'PAID_UNASSIGNED' | 'ASSIGNED' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED';
  origin: string; // Placeholder or textual representation
  destination: string; // Placeholder or textual representation
  eta?: string;
  progress: number; // 0-100
  weight: string;
  cargoSpec?: string;
  amount: number;
  createdAt: string;
  pickupH3Cell: string;
  dropoffH3Cell: string;
  riderId?: string | null;
}

interface BookingData {
  pickupName: string;
  pickupPhone: string;
  pickupAddress: string;
  pickupCoords: { lat: number; lng: number } | null;
  dropoffName: string;
  dropoffPhone: string;
  dropoffAddress: string;
  dropoffCoords: { lat: number; lng: number } | null;
  itemDescription: string;
  weightPreset: 'document' | 'small_box' | 'medium_box' | null;
  budgetEstimate: number;
  preferredDeliveryTime: string | null;
}

interface CustomerDashboardState {
  activeView: DashboardView;
  activeShipment: Shipment | null;
  activeDeliveriesCount: number;
  wizardStep: WizardStep;
  wizardData: BookingData;
  ledgerTab: LedgerTab;
  isLoading: boolean;
}

interface CustomerDashboardActions {
  setActiveView: (view: DashboardView) => void;
  setActiveShipment: (shipment: Shipment | null) => void;
  setWizardStep: (step: WizardStep) => void;
  updateWizardData: (data: Partial<BookingData>) => void;
  setLedgerTab: (tab: LedgerTab) => void;
  navigateTo: (view: DashboardView) => void;
  createNewBooking: () => void;
}

type CustomerDashboardContextType = CustomerDashboardState & CustomerDashboardActions;

const defaultWizardData: BookingData = {
  pickupName: '',
  pickupPhone: '',
  pickupAddress: '',
  pickupCoords: null,
  dropoffName: '',
  dropoffPhone: '',
  dropoffAddress: '',
  dropoffCoords: null,
  itemDescription: '',
  weightPreset: null,
  budgetEstimate: 0,
  preferredDeliveryTime: null,
};

const CustomerDashboardContext = createContext<CustomerDashboardContextType | undefined>(undefined);

export function CustomerDashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<DashboardView>('command_map');
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [activeDeliveriesCount, setActiveDeliveriesCount] = useState<number>(0);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardData, setWizardData] = useState<BookingData>(defaultWizardData);
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserClient();

  // 1. Initial Fetch of Active Shipment
  useEffect(() => {
    let isMounted = true;
    
    async function fetchActiveShipment() {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Fetch latest active order (not cancelled/delivered)
        const { data: order, error } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', session.user.id)
          .not('status', 'in', '("DELIVERED","CANCELLED")')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); // Use maybeSingle to prevent PGRST116 errors if no orders are found

        if (order && isMounted) {
          const progressMap: Record<string, number> = {
            'PLACED': 10,
            'PAID_UNASSIGNED': 20,
            'ASSIGNED': 40,
            'PICKED_UP': 70,
            'DELIVERED': 100,
            'CANCELLED': 0
          };

          setActiveShipment({
            id: order.id,
            trackingCode: order.id.split('-')[0].toUpperCase(),
            status: order.status,
            pickupH3Cell: order.pickup_h3_cell,
            dropoffH3Cell: order.dropoff_h3_cell,
            origin: 'Origin Hub (Resolved via H3)',
            destination: 'Dest Hub (Resolved via H3)',
            eta: 'Pending',
            progress: progressMap[order.status] || 0,
            weight: 'N/A', // Would fetch from parcels table if joining
            amount: order.total_amount,
            createdAt: order.created_at,
            riderId: order.rider_id
          });
        }

        // Fetch count of all active deliveries for this customer
        const { count, error: countError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', session.user.id)
          .not('status', 'in', '("DELIVERED","CANCELLED")');

        if (!countError && isMounted && count !== null) {
          setActiveDeliveriesCount(count);
        }
      } catch (err) {
        console.error('[CustomerDashboardContext] Error fetching active shipment:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchActiveShipment();
    
    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // 2. Realtime Subscription to active shipment updates & order count
  useEffect(() => {
    let isMounted = true;
    
    const fetchCount = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', session.user.id)
        .not('status', 'in', '("DELIVERED","CANCELLED")');
      if (isMounted && count !== null) setActiveDeliveriesCount(count);
    };

    const channel = supabase
      .channel(`customer-orders`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('Orders table update received!', payload);
          // Refresh the count when any order changes
          fetchCount();
          
          // Also update activeShipment if this event is for the current active shipment
          if (activeShipment && payload.new && 'id' in payload.new && payload.new.id === activeShipment.id) {
            const newOrder = payload.new as any;
            const progressMap: Record<string, number> = {
              'PLACED': 10,
              'PAID_UNASSIGNED': 20,
              'ASSIGNED': 40,
              'PICKED_UP': 70,
              'DELIVERED': 100,
              'CANCELLED': 0
            };
            setActiveShipment((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                status: newOrder.status,
                progress: progressMap[newOrder.status] || prev.progress,
                riderId: newOrder.rider_id
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [activeShipment?.id, supabase]);

  const navigateTo = useCallback((view: DashboardView) => {
    setActiveView(view);
  }, []);

  const createNewBooking = useCallback(() => {
    setWizardStep(1);
    setWizardData(defaultWizardData);
    setActiveView('booking_wizard');
  }, []);

  const updateWizardData = useCallback((data: Partial<BookingData>) => {
    setWizardData((prev) => ({ ...prev, ...data }));
  }, []);

  const value = useMemo<CustomerDashboardContextType>(
    () => ({
      activeView,
      activeShipment,
      activeDeliveriesCount,
      wizardStep,
      wizardData,
      ledgerTab,
      isLoading,
      setActiveView,
      setActiveShipment,
      setWizardStep,
      updateWizardData,
      setLedgerTab,
      navigateTo,
      createNewBooking,
    }),
    [activeView, activeShipment, activeDeliveriesCount, wizardStep, wizardData, ledgerTab, isLoading, navigateTo, createNewBooking, updateWizardData]
  );

  return (
    <CustomerDashboardContext.Provider value={value}>
      {children}
    </CustomerDashboardContext.Provider>
  );
}

export function useCustomerDashboard() {
  const context = useContext(CustomerDashboardContext);
  if (!context) {
    throw new Error('useCustomerDashboard must be used within a CustomerDashboardProvider');
  }
  return context;
}

/** Safe version that returns null instead of throwing — for use in shared components like Sidebar */
export function useCustomerDashboardSafe() {
  try {
    return useCustomerDashboard();
  } catch {
    return null;
  }
}
