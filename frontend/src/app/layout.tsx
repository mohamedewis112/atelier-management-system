/**
 * Root Layout Component
 * 
 * Purpose: Provides the base HTML structure and global styles for the entire application.
 * Includes RTL support for Hebrew content.
 */

import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ServiceWorkerRegister } from '@/components/pwa/sw-register';
import { ErrorBoundary } from '@/components/error-boundary';
import { GlobalErrorReporter } from '@/components/global-error-reporter';

export const metadata: Metadata = {
  title: 'نظام إدارة الأتيليه',
  description: 'نظام متكامل لإدارة الأتيليه والحجوزات والعملاء والقطع والحسابات',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen max-w-full overflow-x-hidden bg-background antialiased">
        <GlobalErrorReporter />
        <ServiceWorkerRegister />
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster />
      </body>
    </html>
  );
}
