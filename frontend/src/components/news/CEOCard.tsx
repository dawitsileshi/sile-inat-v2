import { motion } from 'framer-motion'
import { GraduationCap, Award, Mail, ExternalLink } from 'lucide-react'
import type { CEOLeader } from '@/data/news'

interface CEOCardProps {
  leader: CEOLeader
  index?: number
  expanded?: boolean
}

export function CEOCard({ leader, index = 0, expanded = false }: CEOCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="overflow-hidden rounded-3xl bg-white card-shadow"
    >
      <div className="flex flex-col sm:flex-row">
        {/* CEO Photo */}
        <div className="relative shrink-0 sm:w-56">
          <img
            src={leader.photo}
            alt={leader.name}
            className="h-64 w-full object-cover object-top sm:h-full sm:min-h-[320px]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-transparent sm:to-white/20" />
        </div>

        {/* Info */}
        <div className="flex-1 p-6 sm:p-8">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-brand">
            {leader.role}
          </div>
          <h3 className="text-xl font-bold text-text-primary">{leader.name}</h3>

          <p className="mt-3 text-sm leading-relaxed text-text-secondary">
            {leader.bio}
          </p>

          {expanded && (
            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <GraduationCap className="h-4 w-4 text-brand" />
                  Education
                </div>
                <p className="text-sm text-text-secondary">{leader.education}</p>
              </div>

              <div>
                <div className="mb-2 text-sm font-semibold text-text-primary">Experience</div>
                <ul className="space-y-1.5">
                  {leader.experience.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
                  <Award className="h-4 w-4 text-brand" />
                  Key Achievements
                </div>
                <ul className="space-y-1.5">
                  {leader.achievements.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                {leader.email && (
                  <a
                    href={`mailto:${leader.email}`}
                    className="flex items-center gap-1.5 rounded-full bg-brand-light px-4 py-2 text-xs font-medium text-brand transition-colors hover:bg-brand-muted"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {leader.email}
                  </a>
                )}
                {leader.linkedin && (
                  <a
                    href={leader.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-brand hover:text-brand"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    LinkedIn Profile
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
