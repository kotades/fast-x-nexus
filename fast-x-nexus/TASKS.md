# Fast X Nexus — Rider Dashboard Build Checklist

## Phase 1 — Foundation (Context, Shell, Route, Sidebar)
- [ ] Create `RiderDashboardContext` (`src/components/rider/contexts/RiderDashboardContext.tsx`)
- [ ] Create `RiderDashboardShell` (`src/components/rider/shared/RiderDashboardShell.tsx`)
- [ ] Create `/rider` route page (`src/app/rider/page.tsx`)
- [ ] Create `RiderDashboardContent` (`src/app/rider/RiderDashboardContent.tsx`)
- [ ] Fix Sidebar rider nav items to use view-based `navigateTo()` (remove `<a>` links)
- [ ] Reuse `ProfilePage` under RiderDashboardShell
- [ ] Create `src/components/rider/` directory structure
- [ ] Update `RiderDashboardLayout` to include `RiderDashboardProvider`

## Phase 2 — Job Pool View
- [ ] Create `JobCard` component
- [ ] Create `JobPool` view (filterable grid, skeleton loading, Framer Motion staggered entry)
- [ ] Create `JobPoolFilters` by distance, earnings, vehicle type
- [ ] Wire into `RiderDashboardShell`

## Phase 3 — Active Jobs / Waybill View
- [ ] Create `DeliveryProgress` with spring-animated progress bar
- [ ] Create `WaybillCard` (pickup/dropoff details, ETA, customer info)
- [ ] Create `ActiveJobs` view composing waybill + progress + action buttons
- [ ] Create `DeliveryConfirmation` modal for proof of delivery
- [ ] Wire into `RiderDashboardShell`

## Phase 4 — Earnings & Performance View
- [ ] Create `EarningsSummary` (total, this week, pending with animated counters)
- [ ] Create `EarningsChart` (weekly breakdown)
- [ ] Create `PerformanceStats` (ratings, completed jobs, acceptance rate)
- [ ] Create `EarningsPage` composite view
- [ ] Wire into `RiderDashboardShell`

## Phase 5 — Polish & Build Verification
- [ ] Run `npm run build` — zero errors
- [ ] Verify sidebar navigation works in all directions
- [ ] Verify AnimatePresence transitions between views
- [ ] Verify Profile page renders with scrolling enabled
- [ ] Verify RiderDashboardLayout wraps correctly
- [ ] Merge to main branch