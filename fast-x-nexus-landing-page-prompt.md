# Fast X Nexus Landing Page - Comprehensive Design & Development Prompt

## Overview
Create a high-conversion landing page for Fast X Nexus, a logistics operations platform, following the "Hero + Features + CTA" pattern with modern design principles, responsive layout, and seamless integration with the existing design system.

## Design System Integration

### Color Tokens (from globals.css)
```css
--color-primary: #347227 (Forest Green - Brand)
--color-primary-hover: #1a5910
--color-accent: #E4A800 (Gold - Secondary)
--color-accent-hover: #ca8a04
--color-surface: #f0f5ed
--color-text: #121212
--color-text-muted: #717a6b
```

### Typography
- **Font Family**: Inter (sans-serif), JetBrains Mono (monospace)
- **Headings**: Font weight 700-900, tracking-tight
- **Body**: Font weight 400-500, line-height 1.5
- **Scale**: text-base (16px) to text-5xl (48px)

### Spacing & Layout
- **Base Unit**: 16px (1rem)
- **Container**: max-width 1280px with horizontal padding 2rem
- **Grid**: 12-column responsive grid with gap 1.5rem

## Page Structure & Content

### 1. Hero Section
**Design Pattern**: Full-width hero with gradient overlay
**Content**:
```markdown
# Lightning-Fast Logistics, Delivered
Real-time tracking, instant booking, and seamless delivery management for modern businesses.

[Primary CTA: "Start Shipping Now" - Gold button]
[Secondary CTA: "See How It Works" - Outline button]
```

**Visual Elements**:
- Background: Linear gradient from `--color-primary` to `--color-accent` (diagonal, 135deg)
- Hero image: Abstract logistics visualization (isometric delivery network or dashboard preview)
- Animation: Parallax effect on scroll (translateY with 0.5x speed)

**Implementation**:
```jsx
<section className="relative overflow-hidden bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] text-white">
  <div className="container mx-auto px-4 py-24 md:py-32 lg:py-40">
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col justify-center">
        <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-6xl">
          Lightning-Fast Logistics,<br />Delivered
        </h1>
        <p className="mt-6 text-lg md:text-xl lg:text-2xl">
          Real-time tracking, instant booking, and seamless delivery management
        </p>
        <div className="mt-8 flex flex-col gap-4 sm:flex-row">
          <Button variant="primary" size="lg">
            Start Shipping Now
          </Button>
          <Button variant="secondary" size="lg">
            See How It Works
          </Button>
        </div>
      </div>
      <div className="relative">
        <Image
          src="/hero-visualization.svg"
          alt="Fast X Nexus logistics network"
          width={800}
          height={600}
          className="w-full"
          priority
        />
      </div>
    </div>
  </div>
</section>
```

### 2. Value Proposition
**Design Pattern**: Three-column feature highlights with icons
**Content**:
```markdown
### Real-time Tracking
Monitor shipments with live GPS updates and estimated delivery times.

### Instant Booking
Schedule pickups and deliveries in seconds with our intuitive interface.

### Smart Routing
AI-powered route optimization reduces costs and improves efficiency.
```

**Implementation**:
```jsx
<section className="py-16 bg-[var(--color-surface)]">
  <div className="container mx-auto px-4">
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      {[
        {
          icon: <MapIcon className="h-8 w-8 text-[var(--color-primary)]" />,
          title: "Real-time Tracking",
          description: "Monitor shipments with live GPS updates and estimated delivery times."
        },
        {
          icon: <CalendarIcon className="h-8 w-8 text-[var(--color-primary)]" />,
          title: "Instant Booking",
          description: "Schedule pickups and deliveries in seconds with our intuitive interface."
        },
        {
          icon: <RouteIcon className="h-8 w-8 text-[var(--color-primary)]" />,
          title: "Smart Routing",
          description: "AI-powered route optimization reduces costs and improves efficiency."
        }
      ].map((feature, index) => (
        <div key={index} className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-primary-muted)]">
            {feature.icon}
          </div>
          <h3 className="text-xl font-semibold">{feature.title}</h3>
          <p className="mt-2 text-[var(--color-text-muted)]">{feature.description}</p>
        </div>
      ))}
    </div>
  </div>
</section>
```

### 3. Key Features Section
**Design Pattern**: Feature cards with hover effects
**Content**:
```markdown
## Powerful Features for Modern Logistics

- **Multi-carrier Integration**: Connect with all major carriers through a single platform
- **AI Route Optimization**: Intelligent algorithms find the most efficient delivery paths
- **Automated Notifications**: Keep customers informed with real-time status updates
- **Analytics Dashboard**: Gain insights with comprehensive performance metrics
- **API Access**: Seamless integration with your existing systems
```

**Implementation**:
```jsx
<section className="py-16 bg-white">
  <div className="container mx-auto px-4">
    <h2 className="text-center text-3xl font-bold tracking-tight md:text-4xl">
      Powerful Features for Modern Logistics
    </h2>
    <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {features.map((feature, index) => (
        <Card
          key={index}
          className="group hover:shadow-lg transition-all duration-300"
        >
          <div className="p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--color-primary-muted)]">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 text-[var(--color-text-muted)]">
              {feature.description}
            </p>
          </div>
        </Card>
      ))}
    </div>
  </div>
</section>
```

### 4. Social Proof Section
**Design Pattern**: Testimonial carousel with company logos
**Content**:
```markdown
## Trusted by Industry Leaders

"Fast X Nexus transformed our delivery operations. We've reduced costs by 23% while improving customer satisfaction."
- Sarah Johnson, Logistics Manager at Acme Corp

[Company logos: Acme Corp, Globex, Initech, Veelo, Umbrella]
```

**Implementation**:
```jsx
<section className="py-16 bg-[var(--color-surface)]">
  <div className="container mx-auto px-4">
    <h2 className="text-center text-3xl font-bold tracking-tight">
      Trusted by Industry Leaders
    </h2>
    <div className="mt-12">
      <TestimonialCarousel testimonials={testimonials} />
    </div>
    <div className="mt-12 flex flex-wrap justify-center gap-8">
      {partners.map((partner, index) => (
        <Image
          key={index}
          src={partner.logo}
          alt={`${partner.name} logo`}
          width={120}
          height={40}
          className="h-8 w-auto opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
        />
      ))}
    </div>
  </div>
</section>
```

### 5. Conversion CTA Section
**Design Pattern**: High-contrast call-to-action
**Content**:
```markdown
## Ready to Transform Your Logistics?

✅ Real-time visibility across your entire network
✅ Reduce delivery times and operational costs
✅ Scale effortlessly with our cloud platform

[Primary CTA: "Get Started Free" - Large button]
[Secondary: "Contact Sales" - Link]
```

**Implementation**:
```jsx
<section className="py-16 bg-[var(--color-primary)] text-white">
  <div className="container mx-auto px-4 text-center">
    <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
      Ready to Transform Your Logistics?
    </h2>
    <ul className="mt-6 space-y-2 text-lg">
      <li className="flex items-center justify-center gap-2">
        <CheckIcon className="h-5 w-5" /> Real-time visibility across your entire network
      </li>
      <li className="flex items-center justify-center gap-2">
        <CheckIcon className="h-5 w-5" /> Reduce delivery times and operational costs
      </li>
      <li className="flex items-center justify-center gap-2">
        <CheckIcon className="h-5 w-5" /> Scale effortlessly with our cloud platform
      </li>
    </ul>
    <div className="mt-8 flex flex-col gap-4 sm:flex-row justify-center">
      <Button variant="secondary" size="lg" className="bg-white text-[var(--color-primary)] hover:bg-gray-100">
        Get Started Free
      </Button>
      <Button variant="text" size="lg" className="text-white hover:text-gray-200">
        Contact Sales
      </Button>
    </div>
  </div>
</section>
```

### 6. Footer Section
**Design Pattern**: Comprehensive footer with navigation
**Implementation**:
```jsx
<Footer>
  <div className="container mx-auto px-4 py-12">
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
      <div>
        <h3 className="font-semibold">Product</h3>
        <ul className="mt-4 space-y-2">
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Features</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Pricing</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Integrations</a></li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">Company</h3>
        <ul className="mt-4 space-y-2">
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">About</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Careers</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Blog</a></li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">Resources</h3>
        <ul className="mt-4 space-y-2">
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Documentation</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">API Reference</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Help Center</a></li>
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">Legal</h3>
        <ul className="mt-4 space-y-2">
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Privacy Policy</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Terms of Service</a></li>
          <li><a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Cookie Policy</a></li>
        </ul>
      </div>
    </div>
    <div className="mt-8 border-t border-[var(--color-border)] pt-8 flex flex-col gap-4 md:flex-row justify-between items-center">
      <p className="text-sm text-[var(--color-text-muted)]">
        © {new Date().getFullYear()} Fast X Nexus. All rights reserved.
      </p>
      <div className="flex gap-4">
        <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <TwitterIcon className="h-5 w-5" />
        </a>
        <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <LinkedInIcon className="h-5 w-5" />
        </a>
        <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <GitHubIcon className="h-5 w-5" />
        </a>
      </div>
    </div>
  </div>
</Footer>
```

## Technical Requirements

### Responsive Design
```css
/* Breakpoints */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
@media (min-width: 1536px) { /* 2xl */ }
```

### Performance Optimization
- **Images**: Use Next.js Image component with optimized formats
- **Lazy Loading**: Implement for non-critical assets
- **Bundle Size**: Keep JavaScript under 200KB for core functionality
- **Critical CSS**: Inline above-the-fold styles

### Accessibility
- **Semantic HTML**: Proper use of headings, landmarks, and ARIA attributes
- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for large text
- **Focus Management**: Visible focus indicators for keyboard users

### Animation & Interactions
- **Entrance Animations**: Fade-in and slide-up effects (200-300ms)
- **Hover States**: Scale transforms (0.97-1.03) with smooth transitions
- **Spring Physics**: Use cubic-bezier(0.175, 0.885, 0.32, 1.275) for natural motion
- **Parallax**: Subtle effects with 0.3-0.7x scroll speed

### Integration Points
- **Authentication**: Connect CTA buttons to existing auth flows (/login, /onboarding)
- **Design Tokens**: Use variables from globals.css for consistency
- **Component Library**: Reuse existing Button, Card, and Footer components
- **Analytics**: Implement tracking for CTA clicks and section visibility

## Implementation Checklist

1. **Setup**:
   - Create new page.tsx in /src/app/
   - Import required components and hooks
   - Set up page metadata (title, description, OG tags)

2. **Structure**:
   - Implement responsive grid system
   - Create section components with proper spacing
   - Add semantic HTML structure

3. **Content**:
   - Write compelling copy for each section
   - Source or create appropriate imagery
   - Implement icon system (Material Symbols)

4. **Styling**:
   - Apply design tokens consistently
   - Implement hover/focus states
   - Add responsive breakpoints

5. **Interactivity**:
   - Set up smooth scrolling
   - Implement carousel functionality
   - Add form validation (if applicable)

6. **Optimization**:
   - Add lazy loading for images
   - Implement critical CSS
   - Set up performance monitoring

7. **Testing**:
   - Cross-browser compatibility
   - Mobile responsiveness
   - Accessibility audit
   - Performance testing (Lighthouse score > 90)

## Success Metrics
- **Conversion Rate**: Target 8-12% for primary CTA
- **Bounce Rate**: Below 40%
- **Time on Page**: Average 2-3 minutes
- **Scroll Depth**: 75% of visitors reach footer
- **Performance**: Lighthouse score > 90 (Desktop & Mobile)

This comprehensive prompt provides all the necessary design directives, technical specifications, and implementation details to create a high-converting landing page for Fast X Nexus that aligns with the existing design system and follows modern UI/UX best practices.