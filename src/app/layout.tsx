// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import Script from "next/script";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ExamPro - Ace Your GATE & SSC Exams",
  description: "Practice with 200,000+ questions and achieve your dreams",
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
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
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
