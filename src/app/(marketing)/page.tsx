//src/app/(marketing)/page.tsx
import { Hero } from '@/components/marketing/Hero'
import { StatsBar } from '@/components/marketing/StatsBar'
import { Features } from '@/components/marketing/Features'
import { HowItWorks } from '@/components/marketing/HowItWorks'
import { PopularExams } from '@/components/marketing/PopularExams'
import { Testimonials } from '@/components/marketing/Testimonials'
import { Pricing } from '@/components/marketing/Pricing'
import { FinalCTA } from '@/components/marketing/FinalCTA'

export default function HomePage() {
  return (
    <main>
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <PopularExams />
      <Testimonials />
      <Pricing />
      <FinalCTA />
    </main>
  )
}