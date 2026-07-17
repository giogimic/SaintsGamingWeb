import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsent } from "@/components/shared/cookie-consent";
import { ForcePasswordRedirect } from "@/components/auth/force-password-redirect";

import { DevOverlayLoader } from "@/components/dev/dev-overlay-loader";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth-provider";
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
  description: "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
  openGraph: {
    title: "Saints Gaming",
    description: "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
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
    description: "Saints Gaming - Game Servers, Mod Packs, Community its Time To Play!",
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
