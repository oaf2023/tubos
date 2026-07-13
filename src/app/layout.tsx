import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import PWARegister from "@/components/pwa-register";
import FloatingUtilities from "@/components/floating-utilities";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#eab308",
};

export const metadata: Metadata = {
  title: "Control Digital ManejaDatos - Districon",
  description: "Sistema integral de control y geolocalización de tubos de gases para soldadura. Gestion, trazabilidad y logistica de activos industriales.",
  keywords: ["gases soldadura", "tubos gases", "argón", "acetileno", "oxígeno", "logística Argentina", "San Nicolás de los Arroyos"],
  authors: [{ name: "Control Digital ManejaDatos Districon" }],
  // manifest auto-generated from app/manifest.ts
  appleWebApp: {
    capable: true,
    title: "Districon",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  formatDetection: {
    telephone: true,
    address: false,
    email: false,
  },
  openGraph: {
    title: "Control Digital ManejaDatos - Districon",
    description: "Sistema integral de control y geolocalización de tubos de gases para soldadura",
    siteName: "Control Digital ManejaDatos Districon",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Control Digital ManejaDatos - Districon",
    description: "Sistema integral de control y geolocalización de tubos de gases para soldadura",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Districon" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Districon" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <PWARegister />
        <FloatingUtilities />
      </body>
    </html>
  );
}
