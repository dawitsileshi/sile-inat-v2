import { useState, useMemo } from 'react'
import { motion, useScroll, useSpring } from 'framer-motion'
import { Search, Bell, Compass } from 'lucide-react'

// Repo imports
import { organizations, type Organization, type OrganizationCategory } from '@/data/organizations'
import { SearchBar } from '@/components/ui/SearchBar'
import { Modal } from '@/components/ui/Modal'
import { CategoryFilter } from '@/components/discover/CategoryFilter'
import { OrganizationCard } from '@/components/discover/OrganizationCard'
import { OrganizationDetail } from '@/components/discover/OrganizationDetail'
import { FeaturedBanner } from '@/components/discover/FeaturedBanner'

// My new imports (integrated with named exports)
import { FeaturedExperts } from '@/components/experts/ExpertsSection'
import { CommunityHighlights } from '@/components/community/CommunitySection'
import { InteractiveCalendar } from '@/components/events/EventsSection'
import { KnowledgeSection } from '@/components/knowledge/KnowledgeSection'
import { DiscoveryFeed } from '@/components/discovery/DiscoveryFeed'

export function DiscoverPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<OrganizationCategory>('all')
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)

  const { scrollYProgress } = useScroll()
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  })

  const featured = organizations.find((o) => o.id === 'yenehealth')!

  const filtered = useMemo(() => {
    return organizations.filter((org) => {
      const matchesCategory = category === 'all' || org.category === category
      const matchesSearch =
        search === '' ||
        org.name.toLowerCase().includes(search.toLowerCase()) ||
        org.tagline.toLowerCase().includes(search.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [search, category])

  const relatedOrgs = selectedOrg
    ? organizations.filter((o) => selectedOrg.relatedIds.includes(o.id))
    : []

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Reading Progress Bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1.5 bg-emerald-500 origin-left z-50 rounded-r-full" 
        style={{ scaleX }} 
      />

      <main className="max-w-7xl mx-auto px-6 space-y-12 pb-24">
        {/* Intro from my design */}
        <section className="pt-16 pb-8 text-center max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-5xl md:text-7xl font-black text-slate-900 mb-8 leading-[1.1]"
          >
            Your Daily Dose of <span className="text-emerald-500">Well-being.</span>
          </motion.h2>
          <p className="text-xl text-slate-500 leading-relaxed">
            Explore our curated selection of experts, stories, and events designed 
            to nurture your mind, body, and spirit.
          </p>
        </section>

        {/* Integrated: Repo's Organization Search & Filter */}
        <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-xl shadow-slate-100/30">
          <div className="text-center mb-10">
            <h3 className="text-2xl font-bold text-slate-900">Wellness Directory</h3>
            <p className="text-slate-500">Explore Ethiopian health startups and initiatives</p>
          </div>
          
          <div className="mx-auto mb-8 max-w-xl">
            <SearchBar value={search} onChange={setSearch} placeholder="Search organizations..." />
          </div>

          <div className="mb-10">
            <CategoryFilter active={category} onChange={setCategory} />
          </div>

          <div className="mb-12">
            <FeaturedBanner org={featured} onClick={() => setSelectedOrg(featured)} />
          </div>

          <h4 className="mb-6 text-lg font-bold text-slate-900">
            All Organizations <span className="text-sm font-normal text-slate-400">({filtered.length})</span>
          </h4>

          {filtered.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((org, i) => (
                <OrganizationCard key={org.id} org={org} index={i} onClick={() => setSelectedOrg(org)} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-slate-50 py-16 text-center">
              <p className="text-slate-400">No organizations found matching your criteria.</p>
            </div>
          )}
        </div>

        {/* My Dynamic Sections */}
        <div id="experts">
          <FeaturedExperts />
        </div>
        
        <div id="community">
          <CommunityHighlights />
        </div>
        
        <div id="events">
          <InteractiveCalendar />
        </div>
        
        <div id="knowledge">
          <KnowledgeSection />
        </div>
        
        <div className="pt-12 border-t border-slate-100">
          <DiscoveryFeed />
        </div>
        
        {/* Call to Action */}
        <section className="mt-24 bg-slate-900 rounded-[3rem] p-12 md:p-24 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-6xl font-black text-white mb-8">Ready to join the community?</h2>
            <p className="text-slate-400 text-xl mb-12 leading-relaxed">
              Connect with practitioners, share your journey, and access exclusive wellness content.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button className="bg-emerald-500 text-slate-950 px-10 py-5 rounded-3xl font-black text-lg hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20">
                Join Now for Free
              </button>
            </div>
          </div>
        </section>
      </main>

      <Modal isOpen={!!selectedOrg} onClose={() => setSelectedOrg(null)} size="full" className="overflow-hidden">
        {selectedOrg && (
          <OrganizationDetail org={selectedOrg} relatedOrgs={relatedOrgs} onSelectRelated={setSelectedOrg} />
        )}
      </Modal>
    </div>
  )
}
