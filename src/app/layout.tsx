import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GasTrack AR - Control de Tubos de Gases para Soldadura",
  description: "Sistema integral de control y geolocalización de tubos de gases para soldadura en Argentina. Base operativa en San Nicolás de los Arroyos.",
  keywords: ["gases soldadura", "tubos gases", "argón", "acetileno", "oxígeno", "logística Argentina", "San Nicolás de los Arroyos"],
  authors: [{ name: "GasTrack AR" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "GasTrack AR",
    description: "Control y geolocalización de tubos de gases para soldadura",
    siteName: "GasTrack AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GasTrack AR",
    description: "Control y geolocalización de tubos de gases para soldadura",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
