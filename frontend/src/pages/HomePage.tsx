import { Hero } from '@/components/home/Hero'
import { HomeFeatures } from '@/components/home/HomeFeatures'
import { HomeStats } from '@/components/home/HomeStats'
import { HomeCTA } from '@/components/home/HomeCTA'

export function HomePage() {
  return (
    <>
      <Hero />
      <HomeFeatures />
      <HomeStats />
      <HomeCTA />
    </>
  )
}
