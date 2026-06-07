import { NightModeBanner } from '@/components/home/NightModeBanner'
import { Hero } from '@/components/home/Hero'
import { HomeFeatures } from '@/components/home/HomeFeatures'
import { HomeStats } from '@/components/home/HomeStats'
import { HomeCTA } from '@/components/home/HomeCTA'

export function HomePage() {
  return (
    <>
      <NightModeBanner />
      <Hero />
      <HomeFeatures />
      <HomeStats />
      <HomeCTA />
    </>
  )
}
