import { motion } from 'framer-motion'
import {
  MapPin, Globe, Mail, Phone, Calendar, Target, Eye,
  ExternalLink, Users, ArrowRight,
} from 'lucide-react'
import type { Organization } from '@/data/organizations'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface OrganizationDetailProps {
  org: Organization
  relatedOrgs: Organization[]
  onSelectRelated: (org: Organization) => void
}

export function OrganizationDetail({ org, relatedOrgs, onSelectRelated }: OrganizationDetailProps) {
  return (
    <div className="max-h-[85vh] overflow-y-auto rounded-3xl">
      {/* Cover */}
      <div className={cn('relative h-48 bg-gradient-to-br sm:h-56', org.coverGradient)}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
        <div className="absolute bottom-[-2rem] left-8 flex items-end gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-white bg-brand text-2xl font-bold text-white shadow-xl sm:h-24 sm:w-24">
            {org.logo}
          </div>
          <div className="mb-2">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg sm:text-3xl">
              {org.name}
            </h2>
            <p className="text-sm text-white/90 drop-shadow">{org.tagline}</p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8 pt-14 sm:px-8">
        {/* Meta badges */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge>{org.category.replace('-', ' ')}</Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Est. {org.foundingYear}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {org.location}
          </Badge>
          {org.featured && <Badge>Featured Partner</Badge>}
        </div>

        {/* Description */}
        <Section icon={null} title="About">
          <p className="leading-relaxed text-text-secondary">{org.description}</p>
        </Section>

        {/* Mission & Vision */}
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-brand-light p-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-5 w-5 text-brand" />
              <h3 className="font-semibold text-text-primary">Mission</h3>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">{org.mission}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-emerald-50 p-6"
          >
            <div className="mb-3 flex items-center gap-2">
              <Eye className="h-5 w-5 text-brand" />
              <h3 className="font-semibold text-text-primary">Vision</h3>
            </div>
            <p className="text-sm leading-relaxed text-text-secondary">{org.vision}</p>
          </motion.div>
        </div>

        {/* Services */}
        <Section icon={null} title="Services" className="mt-8">
          <div className="grid gap-3 sm:grid-cols-2">
            {org.services.map((service, i) => (
              <motion.div
                key={service}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-3"
              >
                <div className="h-2 w-2 rounded-full bg-brand" />
                <span className="text-sm text-text-primary">{service}</span>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Leadership */}
        <Section icon={<Users className="h-5 w-5" />} title="Leadership" className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {org.leadership.map((leader, i) => (
              <motion.div
                key={leader.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl bg-gray-50 p-5"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {leader.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                </div>
                <h4 className="font-semibold text-text-primary">{leader.name}</h4>
                <p className="text-sm text-brand">{leader.role}</p>
                <p className="mt-2 text-xs leading-relaxed text-text-muted">{leader.bio}</p>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* Contact */}
        <Section icon={null} title="Contact & Links" className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <ContactItem icon={Globe} label="Website" value={org.website} href={org.website} />
            <ContactItem icon={Mail} label="Email" value={org.email} href={`mailto:${org.email}`} />
            <ContactItem icon={Phone} label="Phone" value={org.phone} />
            {org.social.map((s) => (
              <ContactItem key={s.platform} icon={ExternalLink} label={s.platform} value="Visit profile" href={s.url} />
            ))}
          </div>
        </Section>

        {/* Related */}
        {relatedOrgs.length > 0 && (
          <Section icon={null} title="Related Organizations" className="mt-8">
            <div className="grid gap-3 sm:grid-cols-3">
              {relatedOrgs.map((related) => (
                <motion.button
                  key={related.id}
                  whileHover={{ y: -2 }}
                  onClick={() => onSelectRelated(related)}
                  className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 text-left transition-colors hover:bg-brand-light"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-xs font-bold text-white">
                    {related.logo}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-text-primary">{related.name}</p>
                    <p className="truncate text-xs text-text-muted">{related.tagline}</p>
                  </div>
                  <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-brand" />
                </motion.button>
              ))}
            </div>
          </Section>
        )}
      </div>
    </div>
  )
}

function Section({
  icon,
  title,
  children,
  className,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <div className="mb-4 flex items-center gap-2">
        {icon && <span className="text-brand">{icon}</span>}
        <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function ContactItem({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4">
      <div className="rounded-lg bg-brand-light p-2">
        <Icon className="h-4 w-4 text-brand" />
      </div>
      <div>
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary">{value}</p>
      </div>
    </div>
  )

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-80">
        {content}
      </a>
    )
  }

  return content
}
