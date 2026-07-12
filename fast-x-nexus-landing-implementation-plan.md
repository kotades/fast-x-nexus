gn# Fast X Nexus Landing Page - Implementation Plan

## Revised Folder Structure (Dedicated Landing Organization)

```
fast-x-nexus/
├── src/
│   ├── app/
│   │   └── landing/                  # Dedicated landing folder
│   │       ├── page.tsx              # Main landing page
│   │       ├── layout.tsx            # Landing-specific layout
│   │       └── components/           # Landing-specific components
│   │           ├── HeroSection.tsx
│   │           ├── ValueProp.tsx
│   │           ├── OperationsIntel.tsx
│   │           └── ConversionCTA.tsx
│   │
│   ├── components/
│   │   └── landing/                 # Dedicated landing components
│   │       ├── animations/           # Animation components
│   │       │   ├── GlowingOrb.tsx
│   │       │   ├── TypewriterText.tsx
│   │       │   ├── DashboardMockup.tsx
│   │       │   ├── AnimatedNode.tsx
│   │       │   └── DataVisualization.tsx
│   │       ├── ui/                   # Landing-specific UI
│   │       │   ├── GlassCard.tsx
│   │       │   ├── BentoGrid.tsx
│   │       │   └── AnimatedButton.tsx
│   │       └── sections/             # Section components
│   │           ├── PartnerLogos.tsx
│   │           ├── FeatureHighlights.tsx
│   │           └── TestimonialCarousel.tsx
│   │
│   └── styles/
│       └── landing/                 # Landing-specific styles
│           ├── animations.css
│           ├── hero.css
│           └── bento-grid.css
```

## Implementation Plan

### Phase 1: Setup & Foundation

#### 1.1 Create Folder Structure
```bash
mkdir -p fast-x-nexus/src/app/landing/components
mkdir -p fast-x-nexus/src/components/landing/animations
mkdir -p fast-x-nexus/src/components/landing/ui
mkdir -p fast-x-nexus/src/components/landing/sections
mkdir -p fast-x-nexus/src/styles/landing
```

#### 1.2 Install Required Dependencies
```bash
npm install remotion @remotion/transitions @remotion/light-leaks framer-motion threejs gsap
npm install --save-dev @types/three @types/gsap
```

#### 1.3 Configure Next.js for Animations
Update `next.config.js`:
```javascript
module.exports = {
  // ... existing config
  images: {
    domains: ['lh3.googleusercontent.com', 'fastx-nexus.com'],
  },
  experimental: {
    scrollRestoration: true,
  },
}
```

### Phase 2: Core Animation Components

#### 2.1 GlowingOrb Component (`components/landing/animations/GlowingOrb.tsx`)
```tsx
import { useCurrentFrame, interpolate, Easing } from 'remotion';

interface GlowingOrbProps {
  size: number;
  color: string;
  pulseDuration: number;
  position: { x: number; y: number };
}

export const GlowingOrb = ({ size, color, pulseDuration, position }: GlowingOrbProps) => {
  const frame = useCurrentFrame();

  const scale = interpolate(
    frame % (30 * pulseDuration),
    [0, 15 * pulseDuration, 30 * pulseDuration],
    [1, 1.3, 1],
    {
      easing: Easing.inOut(Easing.quad),
      extrapolateRight: 'clamp'
    }
  );

  const opacity = interpolate(
    frame % (30 * pulseDuration),
    [0, 15 * pulseDuration, 30 * pulseDuration],
    [0.8, 1, 0.8],
    {
      easing: Easing.inOut(Easing.quad),
      extrapolateRight: 'clamp'
    }
  );

  return (
    <div
      className="absolute rounded-full filter blur-3xl"
      style={{
        width: size * 2,
        height: size * 2,
        backgroundColor: color,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity: opacity,
        left: `${position.x}%`,
        top: `${position.y}%`,
        mixBlendMode: 'multiply'
      }}
    />
  );
};
```

#### 2.2 TypewriterText Component (`components/landing/animations/TypewriterText.tsx`)
```tsx
import { useCurrentFrame } from 'remotion';

interface TypewriterTextProps {
  text: string;
  speed?: number;
  className?: string;
}

export const TypewriterText = ({ text, speed = 2, className = '' }: TypewriterTextProps) => {
  const frame = useCurrentFrame();
  const charsToShow = Math.floor(frame / speed);

  return (
    <span className={className}>
      {text.slice(0, charsToShow)}
      <span className="inline-block w-1 h-8 bg-current animate-blink" />
    </span>
  );
};

// Add to global CSS
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
```

#### 2.3 DashboardMockup Component (`components/landing/animations/DashboardMockup.tsx`)
```tsx
import { useCurrentFrame, interpolate } from 'remotion';
import { AnimatedNode } from './AnimatedNode';

export const DashboardMockup = () => {
  const frame = useCurrentFrame();

  // Animated data values
  const activeRoutes = interpolate(frame, [0, 60], [0, 1248], {
    extrapolateRight: 'clamp'
  });

  const throughput = interpolate(frame, [0, 45], [0, 94], {
    extrapolateRight: 'clamp'
  });

  return (
    <div className="glass-panel w-full h-[500px] lg:h-[600px] rounded-xl p-4 relative overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-2 mb-4">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-primary">analytics</span>
          <span className="text-sm font-semibold text-on-surface">Live Network Flow</span>
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
          <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
          <div className="w-2 h-2 rounded-full bg-primary-fixed-dim"></div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow grid grid-cols-3 gap-2 h-full">
        {/* Sidebar */}
        <div className="col-span-1 space-y-2 flex flex-col">
          <div className="bg-surface-container-lowest rounded border border-outline-variant p-2 flex-grow accent-border-left">
            <div className="text-xs text-on-surface-variant mb-1">Active Routes</div>
            <div className="text-2xl font-bold text-primary">{activeRoutes.toLocaleString()}</div>
            <div className="w-full h-1 bg-surface-container mt-2 rounded-full overflow-hidden">
              <div className="h-full bg-primary" style={{ width: `${(activeRoutes / 1500) * 100}%` }}></div>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded border border-outline-variant p-2 flex-grow">
            <div className="text-xs text-on-surface-variant mb-1">Throughput</div>
            <div className="text-2xl font-bold text-secondary">{throughput}%</div>
          </div>
        </div>

        {/* Map Area */}
        <div className="col-span-2 bg-surface-container-lowest rounded border border-outline-variant relative overflow-hidden">
          {/* Background Map */}
          <div
            className="absolute inset-0 bg-cover bg-center w-full h-full opacity-60 mix-blend-luminosity"
            style={{
              backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuBZDVKIgMgMNID03XnGev1gtTG6eCAxoTyuo-W9oe8KCha9NlJoY8Rzcg1w0RIpXDRscciIi1cPO-Qr0Q9OcBb0NZNOH1c3DLd6ZUn4V3JBxc7GnxQtA2_pm-sYnMap0w-h6bbLM1ObTgrTo4njpIPOMS2xed-Lp5-zfRinL7-35xc_ecCX_y3T-MDlmpMmZegK4TQcBEraaRoT7Hgaxrdp-PaK6UOKhNlHsz2fFZw42_RM7KzwzX7b79pIQdmVDosDsEHzmBLkC4Wl')"
            }}
          />

          {/* Animated Nodes */}
          <AnimatedNode position={{ x: 25, y: 30 }} delay={0} />
          <AnimatedNode position={{ x: 70, y: 45 }} delay={5} />
          <AnimatedNode position={{ x: 40, y: 65 }} delay={10} />
          <AnimatedNode position={{ x: 85, y: 20 }} delay={15} />

          {/* Central Hub */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
            <div className="relative">
              <div className="w-12 h-12 bg-surface-container-lowest rounded-full border-2 border-primary flex items-center justify-center shadow-sm">
                <span className="material-symbols-outlined text-primary text-xl">hub</span>
              </div>
              {/* Pulsing ring */}
              <div className="absolute inset-0 rounded-full border-2 border-primary opacity-30 animate-ping" style={{ animationDuration: '2s' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
```

### Phase 3: Hero Section Implementation

#### 3.1 HeroSection Component (`app/landing/components/HeroSection.tsx`)
```tsx
'use client';

import { useEffect, useRef } from 'react';
import { GlowingOrb } from '../../components/landing/animations/GlowingOrb';
import { TypewriterText } from '../../components/landing/animations/TypewriterText';
import { DashboardMockup } from '../../components/landing/animations/DashboardMockup';
import { motion } from 'framer-motion';

export const HeroSection = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  // Animation variants for Framer Motion
  const buttonVariants = {
    initial: { y: 0 },
    hover: {
      y: -2,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 20
      }
    },
    tap: { scale: 0.98 }
  };

  return (
    <section
      ref={heroRef}
      className="relative w-full overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white min-h-[921px] flex items-center justify-center pt-24 pb-24 hex-pattern"
    >
      {/* Animated Background Elements */}
      <GlowingOrb
        size={192}
        color="rgba(165, 244, 153, 0.3)"
        pulseDuration={3}
        position={{ x: 25, y: 25 }}
      />
      <GlowingOrb
        size={144}
        color="rgba(254, 191, 40, 0.25)"
        pulseDuration={2.5}
        position={{ x: 75, y: 75 }}
      />

      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 relative z-10 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">
        {/* Text Content */}
        <div className="space-y-8">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface-container/50 backdrop-blur-md rounded-lg border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-secondary-container text-[18px]">bolt</span>
            <span className="text-on-surface font-medium text-sm uppercase tracking-wider">Next-Gen Logistics Platform</span>
          </motion.div>

          {/* Headline with Typewriter Effect */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight tracking-tighter"
          >
            <TypewriterText
              text="Lightning-Fast Logistics,"
              speed={1.5}
              className="block"
            />
            <span className="text-secondary-container">
              <TypewriterText
                text="Delivered."
                speed={1.5}
                className="block"
              />
            </span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-xl lg:text-2xl text-surface-container-lowest/90 font-medium max-w-2xl leading-relaxed border-l-4 border-secondary-container pl-4"
          >
            Real-time tracking, instant booking, and seamless delivery management engineered for modern enterprise monoliths.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 pt-6"
          >
            <motion.button
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="bg-secondary-container hover:bg-secondary-fixed text-on-secondary-container font-medium px-8 py-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group shadow-md"
            >
              <span>Start Shipping Now</span>
              <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
            </motion.button>
            <motion.button
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              whileTap="tap"
              className="bg-transparent border-2 border-surface-container-lowest hover:bg-surface-container-lowest/10 text-surface-container-lowest font-medium px-8 py-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">play_circle</span>
              <span>See How It Works</span>
            </motion.button>
          </motion.div>
        </div>

        {/* Visual Content - Dashboard Mockup */}
        <div className="relative w-full h-[500px] lg:h-[600px] flex items-center justify-center">
          <DashboardMockup />
        </div>
      </div>

      {/* Diagonal Structural Element */}
      <div
        className="absolute bottom-0 right-0 w-1/2 h-32 bg-[var(--color-surface)] z-20"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
      ></div>
    </section>
  );
};
```

### Phase 4: Value Proposition Section

#### 4.1 ValueProp Component (`app/landing/components/ValueProp.tsx`)
```tsx
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/landing/ui/GlassCard';

const features = [
  {
    icon: 'my_location',
    title: 'Precision Tracking',
    description: 'Pinpoint every asset globally with millimeter accuracy using our low-latency satellite mesh network.',
    color: 'text-primary'
  },
  {
    icon: 'event_available',
    title: 'Instant Booking',
    description: 'Secure capacity across land, sea, and air within milliseconds via our integrated global ledger.',
    color: 'text-primary'
  },
  {
    icon: 'route',
    title: 'Dynamic Routing',
    description: 'AI-driven pathfinding adapts to traffic, weather, and geopolitical shifts in real-time to guarantee delivery.',
    color: 'text-primary'
  }
];

export const ValueProp = () => {
  return (
    <section className="py-16 lg:py-24 bg-[var(--color-surface)] hex-pattern">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-12 lg:mb-16 space-y-4 max-w-3xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-black text-on-surface tracking-tight"
          >
            The Engine Driving Your Supply Chain
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-on-surface-variant text-lg lg:text-xl"
          >
            Precision engineering meets rapid deployment. Our ecosystem provides complete visibility and control over every asset in motion.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="h-full"
            >
              <GlassCard className="h-full p-6 lg:p-8 border-l-4 border-[var(--color-primary)]">
                <div className={`h-12 w-12 ${feature.color} mb-4 flex items-center justify-center`}>
                  <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                </div>
                <h3 className="text-xl lg:text-2xl font-bold text-on-surface mb-3">{feature.title}</h3>
                <p className="text-on-surface-variant leading-relaxed">{feature.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
```

### Phase 5: Operations Intelligence Section

#### 5.1 OperationsIntel Component (`app/landing/components/OperationsIntel.tsx`)
```tsx
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/landing/ui/GlassCard';

export const OperationsIntel = () => {
  // Sample data for animated graph
  const graphData = [20, 40, 35, 60, 50, 80, 45];

  return (
    <section className="py-16 lg:py-24 bg-[var(--color-surface-lowest)]">
      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-12 lg:mb-16 space-y-4 max-w-2xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-on-surface"
          >
            Operations Intelligence
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-on-surface-variant text-lg lg:text-xl"
          >
            Harness real-time data and AI-driven insights to maintain absolute control over your fluid logistics network.
          </motion.p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 grid-rows-2 gap-4 lg:gap-6 auto-rows-[250px] lg:auto-rows-[300px]">
          {/* Large Feature Card - AI Optimization */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-2 row-span-1 md:row-span-2 relative"
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between relative overflow-hidden">
              {/* Background gradient effect */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-[var(--color-primary-fixed)] rounded-full mix-blend-multiply opacity-10 transform translate-x-1/4 -translate-y-1/4"></div>

              <div className="relative z-10">
                <div className="w-12 h-12 bg-[var(--color-primary-container)] text-on-primary rounded flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-on-surface mb-3">AI Optimization & Routing</h3>
                <p className="text-on-surface-variant max-w-md mb-6">
                  Our neural network continuously evaluates traffic, weather, and facility throughput to dynamically reroute assets, ensuring zero downtime.
                </p>
              </div>

              {/* Animated Graph */}
              <div className="relative z-10 mt-auto h-24 lg:h-32 w-full flex items-end space-x-1 lg:space-x-2">
                {graphData.map((value, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0, opacity: 0 }}
                    whileInView={{ height: `${value}%`, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1, duration: 0.8, type: 'spring', stiffness: 300, damping: 20 }}
                    className="flex-1 bg-[var(--color-surface-container-highest)] rounded-t relative"
                  >
                    {value >= 60 && (
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1 bg-[var(--color-surface-container-lowest)] text-on-surface text-xs px-1 border border-outline-variant rounded">
                        Peak
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          {/* Small Feature Card 1 - Real-time Tracking */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="col-span-1 row-span-1"
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between border-l-4 border-[var(--color-primary)]">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="material-symbols-outlined text-[var(--color-secondary)] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>radar</span>
                  <h4 className="text-lg lg:text-xl font-bold text-on-surface uppercase tracking-wider">Real-time Tracking</h4>
                </div>
                <p className="text-on-surface-variant text-sm lg:text-base">Sub-second latency on asset location and status updates.</p>
              </div>
              <div className="flex items-center justify-between border-t border-outline-variant pt-4 mt-auto">
                <span className="text-xs font-mono text-on-surface-variant">Latency: 12ms</span>
                <div className="w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse"></div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Small Feature Card 2 - Data Transparency */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="col-span-1 row-span-1"
          >
            <GlassCard className="h-full p-6 lg:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <span className="material-symbols-outlined text-[var(--color-primary)] text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>dataset</span>
                  <h4 className="text-lg lg:text-xl font-bold text-on-surface uppercase tracking-wider">Data Transparency</h4>
                </div>
                <p className="text-on-surface-variant text-sm lg:text-base">Immutable ledger logs for every transaction and movement.</p>
              </div>
              <a className="text-[var(--color-primary)] text-sm font-medium hover:underline flex items-center space-x-2 mt-auto" href="#">
                <span>View Logs</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
```

### Phase 6: Conversion CTA Section

#### 6.1 ConversionCTA Component (`app/landing/components/ConversionCTA.tsx`)
```tsx
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/landing/ui/GlassCard';

export const ConversionCTA = () => {
  return (
    <section className="py-16 lg:py-24 bg-[var(--color-primary)] text-white relative overflow-hidden">
      {/* Structural background element */}
      <div
        className="absolute right-0 top-0 w-1/3 h-full bg-[var(--color-primary-container)] opacity-10"
        style={{ clipPath: 'polygon(20% 0, 100% 0, 100% 100%, 0 100%)' }}
      ></div>

      <div className="max-w-screen-2xl mx-auto px-4 lg:px-8 relative z-10 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-24">
        {/* Content */}
        <div className="max-w-2xl space-y-8 lg:space-y-12">
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl lg:text-5xl font-black tracking-tight"
          >
            Ready to Command Your Fleet?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl lg:text-2xl text-surface-container-lowest/90"
          >
            Deploy Fast X Nexus today and cut logistical overhead by up to 34% in the first quarter.
          </motion.p>

          {/* Benefits Checklist */}
          <motion.ul
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="space-y-4 pt-4"
          >
            {[
              'Zero-downtime integration with existing ERPs',
              '24/7 dedicated enterprise support',
              'SOC 2 Type II Certified infrastructure'
            ].map((benefit, index) => (
              <motion.li
                key={benefit}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="flex items-start gap-4 text-lg font-medium"
              >
                <span className="material-symbols-outlined text-[var(--color-primary-container)] text-xl flex-shrink-0 mt-1">check_circle</span>
                <span>{benefit}</span>
              </motion.li>
            ))}
          </motion.ul>
        </div>

        {/* Trial Signup Form */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="w-full lg:w-auto flex-shrink-0"
        >
          <GlassCard className="p-8 lg:p-10 rounded-xl border border-outline-variant shadow-xl max-w-sm w-full">
            <div className="text-center space-y-6">
              <h3 className="text-2xl font-bold text-on-surface">Start Free Trial</h3>
              <p className="text-on-surface-variant">Full access to the Nexus platform for 14 days.</p>

              <form className="space-y-4 mt-6 text-left">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-2">Work Email</label>
                  <input
                    className="w-full bg-[var(--color-surface)] border border-outline-variant rounded-lg px-4 py-3 focus:border-[var(--color-primary-container)] focus:ring-1 focus:ring-[var(--color-primary-container)] outline-none transition-colors"
                    placeholder="admin@company.com"
                    type="email"
                  />
                </div>

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-[var(--color-secondary-container)] hover:bg-[var(--color-secondary-fixed)] text-on-secondary-container font-medium px-6 py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 shadow-md"
                  type="button"
                >
                  <span>Initialize Setup</span>
                  <span className="material-symbols-outlined">login</span>
                </motion.button>
              </form>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </section>
  );
};
```

### Phase 7: Main Landing Page Integration

#### 7.1 Landing Page (`app/landing/page.tsx`)
```tsx
import { HeroSection } from './components/HeroSection';
import { ValueProp } from './components/ValueProp';
import { OperationsIntel } from './components/OperationsIntel';
import { ConversionCTA } from './components/ConversionCTA';
import { PartnerLogos } from '../../components/landing/sections/PartnerLogos';
import { Footer } from '../../components/Footer/Footer';

export const metadata = {
  title: 'Fast X Nexus | Lightning-Fast Logistics, Delivered',
  description: 'High-velocity logistics operations platform. Track, book, and manage shipments in real-time with AI-powered route optimization.',
  openGraph: {
    title: 'Fast X Nexus - Next-Gen Logistics Platform',
    description: 'Real-time tracking, instant booking, and seamless delivery management for modern enterprises.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Fast X Nexus Logistics Platform'
      }
    ]
  }
};

export default function LandingPage() {
  return (
    <main className="flex-grow">
      <HeroSection />
      <PartnerLogos />
      <ValueProp />
      <OperationsIntel />
      <ConversionCTA />
      {/* Additional sections can be added here */}
      <Footer />
    </main>
  );
}
```

### Phase 8: Routing Configuration

#### 8.1 Update App Router (`app/layout.tsx`)
```tsx
// Add landing route to main layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-surface)] text-[var(--color-text)]">
        <OtpListenerBootstrap />
        {children}
      </body>
    </html>
  );
}
```

#### 8.2 Create Landing Layout (`app/landing/layout.tsx`)
```tsx
import { Header } from '../../components/Header/Header';

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header variant="landing" />
      {children}
    </>
  );
}
```

### Phase 9: Performance Optimization

#### 9.1 Add Preload for Critical Assets
```html
<!-- Add to app/landing/layout.tsx head section -->
<head>
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
  <link rel="preload" href="/images/hero-bg.jpg" as="image" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
</head>
```

#### 9.2 Implement Lazy Loading
```tsx
// For non-critical sections
const LazyOperationsIntel = dynamic(
  () => import('./components/OperationsIntel'),
  {
    loading: () => <div className="h-[800px] bg-surface-container-lowest animate-pulse"></div>,
    ssr: false
  }
);
```

### Phase 10: Testing & Deployment

#### 10.1 Animation Performance Testing
```javascript
// Add to package.json scripts
"scripts": {
  "test:animations": "lighthouse http://localhost:3000/landing --chrome-flags='--headless' --output=json --budget-path=./budgets.json"
}
```

#### 10.2 Create Budget File (`budgets.json`)
```json
{
  "performance": {
    "timings": [
      { "metric": "first-contentful-paint", "budget": 1800 },
      { "metric": "largest-contentful-paint", "budget": 2500 },
      { "metric": "total-blocking-time", "budget": 300 },
      { "metric": "cumulative-layout-shift", "budget": 0.1 },
      { "metric": "speed-index", "budget": 1300 }
    ],
    "resourceSizes": [
      { "resourceType": "total", "budget": 1600 },
      { "resourceType": "javascript", "budget": 400 },
      { "resourceType": "css", "budget": 150 }
    ]
  }
}
```

## Implementation Timeline

| Phase | Task | Estimated Time |
|-------|------|----------------|
| 1 | Folder Structure Setup | 1 hour |
| 2 | Dependency Installation | 30 mins |
| 3 | Core Animation Components | 4 hours |
| 4 | Hero Section | 3 hours |
| 5 | Value Proposition | 2 hours |
| 6 | Operations Intelligence | 3 hours |
| 7 | Conversion CTA | 2 hours |
| 8 | Main Page Integration | 1 hour |
| 9 | Routing Configuration | 1 hour |
| 10 | Performance Optimization | 2 hours |
| 11 | Testing & QA | 3 hours |
| 12 | Deployment | 1 hour |

**Total Estimated Time:** 24-26 hours

## Success Metrics

1. **Performance:**
   - Lighthouse score > 90 (Desktop & Mobile)
   - First Contentful Paint < 1.8s
   - Largest Contentful Paint < 2.5s
   - Cumulative Layout Shift < 0.1

2. **Animation Quality:**
   - 60 FPS on all modern devices
   - Smooth transitions between sections
   - Proper reduced motion support

3. **User Engagement:**
   - Scroll depth > 75%
   - Time on page > 2 minutes
   - CTA click-through rate > 8%

4. **Code Quality:**
   - Modular, reusable components
   - Proper TypeScript typing
   - Comprehensive documentation
   - Accessibility compliance (WCAG 2.1 AA)

This implementation plan provides a complete blueprint for creating a merged, animation-heavy landing page that combines the best elements from both prototypes while maintaining excellent performance and user experience.