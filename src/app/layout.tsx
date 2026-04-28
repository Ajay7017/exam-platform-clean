// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Mockzy – JEE & NEET Mock Tests | Mock Your Way to AIR 1",
    template: "%s | Mockzy",
  },
  description:
    "Mockzy offers 200,000+ practice questions for JEE Main, JEE Advanced, and NEET. Attempt full mock tests, chapter-wise tests, and get detailed performance analysis to crack your exam.",
  keywords: [
    "JEE mock test",
    "NEET mock test",
    "JEE Main practice",
    "JEE Advanced preparation",
    "online mock test",
    "free mock test India",
    "mockzy",
  ],
  metadataBase: new URL("https://mockzy.co.in"),
  openGraph: {
    title: "Mockzy – JEE & NEET Mock Tests",
    description:
      "Practice with 200,000+ questions. Full mocks, chapter-wise tests, and detailed analysis for JEE & NEET.",
    url: "https://mockzy.co.in",
    siteName: "Mockzy",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* ⭐ Razorpay SDK must be in <head> */}
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "EducationalOrganization",
              name: "Mockzy",
              url: "https://mockzy.co.in",
              description:
                "Mockzy provides mock tests for JEE Main, JEE Advanced, and NEET with 200,000+ practice questions.",
              sameAs: [],
            }),
          }}
        />
      </head>

      <body className={inter.className}>
        {/* Session provider for NextAuth */}
        <SessionProvider>
          {/* Accessibility skip link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary-500 focus:text-white focus:rounded-lg"
          >
            Skip to main content
          </a>

          {children}

          {/* Toast notifications */}
          <Toaster position="top-right" richColors />
        </SessionProvider>
      </body>
    </html>
  );
}
