//src/app/(marketing)/page.tsx
import { Hero } from '@/components/marketing/Hero'
import { StatsBar } from '@/components/marketing/StatsBar'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { PopularExams } from '@/components/marketing/PopularExams'
import { Testimonials } from '@/components/marketing/Testimonials'
import { Pricing } from '@/components/marketing/Pricing'
import { FinalCTA } from '@/components/marketing/FinalCTA'
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Free JEE & NEET Mock Tests – Mock Your Way to AIR 1",
  description:
    "Attempt free and premium mock tests for JEE Main, JEE Advanced, and NEET on Mockzy. 200,000+ questions, real exam pattern, instant results and rank analysis.",
};

export default function HomePage() {
  return (
    <main>
      <Hero />
      {/* <StatsBar /> */}
      {/* <Features /> */}
      <HowItWorks />
      <PopularExams />
      <Testimonials />
      {/* <Pricing /> */}
      {/* <FinalCTA /> */}
    </main>
  )
}