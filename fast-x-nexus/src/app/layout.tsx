import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { OtpListenerBootstrap } from "@/components/auth/OtpListenerBootstrap";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Fast X Nexus — Enterprise Logistics Engine",
  description: "Instant Courier Dispatch Within 15 Minutes Across Lagos. High-velocity spatial logistics operations platform powered by H3 hexagonal indexing.",
};

const logisticsSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "LogisticsService",
      "@id": "https://fastx.ng/#service",
      "name": "Fast X Nexus Logistics",
      "url": "https://fastx.ng",
      "logo": "https://fastx.ng/images/logo.png",
      "image": "https://fastx.ng/images/logo.png",
      "description": "Instant Courier Dispatch Within 15 Minutes Across Lagos. High-velocity spatial logistics operations platform powered by H3 hexagonal indexing.",
      "telephone": "+2349014030047",
      "email": "operations@fastx.ng",
      "serviceType": "Same-Day Express Courier & Freight Dispatch",
      "areaServed": {
        "@type": "AdministrativeArea",
        "name": "Lagos",
        "containedInPlace": {
          "@type": "Country",
          "name": "Nigeria"
        }
      },
      "provider": {
        "@type": "Organization",
        "@id": "https://fastx.ng/#organization",
        "name": "Fast X Nexus Limited",
        "url": "https://fastx.ng",
        "telephone": "+2349014030047",
        "email": "operations@fastx.ng",
        "address": {
          "@type": "PostalAddress",
          "streetAddress": "14 Alexander Avenue, Ikoyi",
          "addressLocality": "Lagos",
          "addressRegion": "Lagos State",
          "postalCode": "101233",
          "addressCountry": "NG"
        }
      },
      "hoursAvailable": {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": [
          "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
        ],
        "opens": "00:00",
        "closes": "23:59"
      }
    }
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(logisticsSchema) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-surface)] text-[var(--color-text)] max-w-full overflow-x-hidden">
        <OtpListenerBootstrap />
        {children}
      </body>
    </html>
  );
}