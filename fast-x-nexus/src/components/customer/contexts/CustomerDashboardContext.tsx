'use client';

/**
 * /src/components/customer/contexts/CustomerDashboardContext.tsx
 * Fast X Nexus — Customer Dashboard State Controller
 *
 * Manages active deliveries count, live shipments, and wizard state.
 * Fully wired to Supabase Realtime for instant synchronization.
 */

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { deriveDualPins } from '@/lib/dispatch/pins';
import { getCustomerOrders, getUserProfile } from '@/app/actions/profile';

export type DashboardView = 'command_map' | 'booking_wizard' | 'activity_ledger' | 'profile';
export type WizardStep = 1 | 2 | 3 | 4;
export type LedgerTab = 'shipping' | 'financial';

export interface Shipment {
  id: string;
  trackingCode: string;
  status: 'PLACED' | 'PAID_UNASSIGNED' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  origin: string;
  destination: string;
  eta?: string;
  progress: number;
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

export interface CompletedBookingSummary {
  id: string;
  orderId?: string;
  trackingCode: string;
  pickupName: string;
  pickupAddress: string;
  pickupPhone?: string;
  dropoffName: string;
  dropoffAddress: string;
  dropoffPhone?: string;
  amount: number;
  weightPreset?: string | null;
  itemDescription?: string;
  status: string;
  createdAt: string;
  pickupPin?: string;
  deliveryPin?: string;
}

interface CustomerDashboardState {
  activeView: DashboardView;
  activeShipment: Shipment | null;
  lastCompletedBooking: CompletedBookingSummary | null;
  showBookingForm: boolean;
  activeDeliveriesCount: number;
  wizardStep: WizardStep;
  wizardData: BookingData;
  ledgerTab: LedgerTab;
  isLoading: boolean;
}

interface CustomerDashboardActions {
  setActiveView: (view: DashboardView) => void;
  setActiveShipment: (shipment: Shipment | null) => void;
  setLastCompletedBooking: (booking: CompletedBookingSummary | null) => void;
  setShowBookingForm: (show: boolean) => void;
  setActiveDeliveriesCount: React.Dispatch<React.SetStateAction<number>>;
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

const ACTIVE_STATUSES = ['PLACED', 'PAID_UNASSIGNED', 'ASSIGNED', 'PICKED_UP'];

const CustomerDashboardContext = createContext<CustomerDashboardContextType | undefined>(undefined);

export function CustomerDashboardProvider({ children }: { children: React.ReactNode }) {
  const [activeView, setActiveView] = useState<DashboardView>('command_map');
  const [activeShipment, setActiveShipment] = useState<Shipment | null>(null);
  const [lastCompletedBooking, setLastCompletedBookingState] = useState<CompletedBookingSummary | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('fastx_last_booking');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return null;
  });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [activeDeliveriesCount, setActiveDeliveriesCount] = useState<number>(0);
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [wizardData, setWizardData] = useState<BookingData>(defaultWizardData);
  const [ledgerTab, setLedgerTab] = useState<LedgerTab>('shipping');
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createBrowserClient();

  const setLastCompletedBooking = useCallback((booking: CompletedBookingSummary | null) => {
    setLastCompletedBookingState(booking);
    if (typeof window !== 'undefined') {
      if (booking) {
        sessionStorage.setItem('fastx_last_booking', JSON.stringify(booking));
      } else {
        sessionStorage.removeItem('fastx_last_booking');
      }
    }
  }, []);

  // 1. Initial Fetch of Active Shipment & Count
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

        // Non-blocking prefetch to warm Redis L1/L2 cache for instantaneous tab switching
        getCustomerOrders().catch(() => {});
        getUserProfile().catch(() => {});

        // Fetch latest active order
        const { data: order } = await supabase
          .from('orders')
          .select(`
            *,
            parcels (
              id,
              weight,
              description
            )
          `)
          .eq('customer_id', session.user.id)
          .in('status', ACTIVE_STATUSES)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (order && isMounted) {
          const progressMap: Record<string, number> = {
            'PLACED': 10,
            'PAID_UNASSIGNED': 20,
            'ASSIGNED': 40,
            'PICKED_UP': 70,
            'IN_TRANSIT': 75,
            'DELIVERED': 100,
            'CANCELLED': 0
          };

          const parcelWeight = (order.parcels as any[])?.[0]?.weight;

          setActiveShipment({
            id: order.id,
            trackingCode: `FX-${order.id.slice(0, 8).toUpperCase()}`,
            status: order.status,
            pickupH3Cell: order.pickup_h3_cell,
            dropoffH3Cell: order.dropoff_h3_cell,
            origin: order.pickup_address || `Pickup Zone`,
            destination: order.dropoff_address || `Dropoff Zone`,
            eta: '15 mins',
            progress: progressMap[order.status] || 20,
            weight: parcelWeight ? `${parcelWeight}kg` : '5kg',
            amount: Number(order.total_amount) || 0,
            createdAt: order.created_at,
            riderId: order.rider_id
          });

          setLastCompletedBookingState((prev) => {
            if (prev) return prev;
            const { pickupPin, deliveryPin } = deriveDualPins(order.id, order.metadata);

            return {
              id: order.id,
              orderId: order.id,
              trackingCode: `FX-${order.id.slice(0, 8).toUpperCase()}`,
              pickupName: order.pickup_name || 'Sender',
              pickupAddress: order.pickup_address || 'Pickup Hub',
              pickupPhone: order.pickup_phone || '',
              dropoffName: order.dropoff_name || 'Recipient',
              dropoffAddress: order.dropoff_address || 'Delivery Point',
              dropoffPhone: order.dropoff_phone || '',
              amount: Number(order.total_amount) || 5000,
              weightPreset: parcelWeight ? `${parcelWeight}kg` : '5kg',
              itemDescription: (order.parcels as any[])?.[0]?.description || 'General Cargo',
              status: order.status,
              createdAt: order.created_at,
              pickupPin,
              deliveryPin,
            };
          });
        }

        // Fetch exact count of active deliveries for this customer
        const { count } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('customer_id', session.user.id)
          .in('status', ACTIVE_STATUSES);

        if (isMounted && count !== null) {
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
        .in('status', ACTIVE_STATUSES);
      if (isMounted && count !== null) setActiveDeliveriesCount(count);
    };

    const channel = supabase
      .channel('customer-orders-feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          fetchCount();
          
          if (activeShipment && payload.new && 'id' in payload.new && payload.new.id === activeShipment.id) {
            const newOrder = payload.new as any;
            const progressMap: Record<string, number> = {
              'PLACED': 10,
              'PAID_UNASSIGNED': 20,
              'ASSIGNED': 40,
              'PICKED_UP': 70,
              'IN_TRANSIT': 75,
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
  }, [activeShipment, supabase]);

  const navigateTo = useCallback((view: DashboardView) => {
    setActiveView(view);
  }, []);

  const createNewBooking = useCallback(() => {
    setWizardStep(1);
    setWizardData(defaultWizardData);
    setShowBookingForm(true);
    setActiveView('booking_wizard');
  }, []);

  const updateWizardData = useCallback((data: Partial<BookingData>) => {
    setWizardData((prev) => ({ ...prev, ...data }));
  }, []);

  const value = useMemo<CustomerDashboardContextType>(
    () => ({
      activeView,
      activeShipment,
      lastCompletedBooking,
      showBookingForm,
      activeDeliveriesCount,
      wizardStep,
      wizardData,
      ledgerTab,
      isLoading,
      setActiveView,
      setActiveShipment,
      setLastCompletedBooking,
      setShowBookingForm,
      setActiveDeliveriesCount,
      setWizardStep,
      updateWizardData,
      setLedgerTab,
      navigateTo,
      createNewBooking,
    }),
    [
      activeView,
      activeShipment,
      lastCompletedBooking,
      showBookingForm,
      activeDeliveriesCount,
      wizardStep,
      wizardData,
      ledgerTab,
      isLoading,
      setActiveView,
      setActiveShipment,
      setLastCompletedBooking,
      setShowBookingForm,
      setActiveDeliveriesCount,
      setWizardStep,
      updateWizardData,
      setLedgerTab,
      navigateTo,
      createNewBooking,
    ]
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

/** Safe version that returns null instead of throwing — for use in shared components like Header and Sidebar */
export function useCustomerDashboardSafe() {
  try {
    return useCustomerDashboard();
  } catch {
    return null;
  }
}
