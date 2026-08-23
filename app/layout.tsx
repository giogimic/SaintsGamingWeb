import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { CookieConsent } from "@/shared/components/cookie-consent";
import { ForcePasswordRedirect } from "@/web/components/auth/force-password-redirect";

import { DevOverlayLoader } from "@/editor/dev-overlay-loader";
import { ThemeProvider } from "@/web/components/theme-provider";
import { AuthProvider } from "@/web/components/auth-provider";
import { JsonLd } from "@/shared/components/json-ld";
import { auth } from "@/auth";
import { Suspense } from "react";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: {
    template: "%s | Saints Gaming",
    default: "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
  },
  description: "Saints Gaming - Dedicated Game Servers, Custom Modpacks, Community Forums, Live Streams, and Embedded MMO Experience.",
  keywords: [
    "Saints Gaming",
    "Forums",
    "News",
    "Live Streams",
    "Modpacks",
    "The Lobby",
    "Game Servers",
    "Community"
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Saints Gaming",
    description: "Saints Gaming - Dedicated Game Servers, Custom Modpacks, Community Forums, Live Streams, and Embedded MMO Experience.",
    url: "https://saintsgaming.net",
    siteName: "Saints Gaming",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Saints Gaming",
    description: "Saints Gaming - Dedicated Game Servers, Custom Modpacks, Community Forums, Live Streams, and Embedded MMO Experience.",
    images: ["/og-image.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <JsonLd />
        <ThemeProvider
          attribute="class"
          defaultTheme="hacker"
          themes={["light", "dark", "hacker"]}
          disableTransitionOnChange
        >
          <AuthProvider session={session}>
            <TooltipProvider>
              {children}
              <ForcePasswordRedirect forcePasswordChange={session?.user?.forcePasswordChange} />
              <CookieConsent />

              <Suspense fallback={null}>
                <DevOverlayLoader />
              </Suspense>
            </TooltipProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
