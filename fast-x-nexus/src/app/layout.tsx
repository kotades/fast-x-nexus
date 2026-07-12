import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { OtpListenerBootstrap } from "@/components/auth/OtpListenerBootstrap";

const jetbrainsMonoSans = JetBrains_Mono({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMonoMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fast X Nexus — Logistics Engine",
  description: "High-velocity logistics operations platform. Track, book, and manage shipments in real-time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMonoSans.variable} ${jetbrainsMonoMono.variable} h-full antialiased`}
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
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Material+Symbols+Outlined:opsz,wght,FILL@20..48,100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-surface)] text-[var(--color-text)]">
        <OtpListenerBootstrap />
        {children}
      </body>
    </html>
  );
}