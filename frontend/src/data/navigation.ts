import {
  Home, MessageSquare, Calendar, Users,
  Smile, Sparkles, Leaf, BookOpen, type LucideIcon,
} from 'lucide-react'

export interface NavLink {
  to: string
  label: string
  icon: LucideIcon
  description: string
  preview: string
  color: string
  iconBg: string
}

export const navLinks: NavLink[] = [
  {
    to: '/',
    label: 'Home',
    icon: Home,
    description: 'Your safe space',
    preview: 'Landing page introducing ስለ እናት.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  {
    to: '/circles',
    label: 'Circles',
    icon: Users,
    description: 'Small groups, same moment',
    preview: 'Themed mother circles by phase and topic.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  {
    to: '/community',
    label: 'Forum',
    icon: MessageSquare,
    description: 'Anonymous community',
    preview: 'Ask questions and share experiences anonymously.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  {
    to: '/comfort',
    label: 'Comfort',
    icon: Leaf,
    description: 'A quiet moment',
    preview: 'Breathing, music, and words that ground.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  {
    to: '/events',
    label: 'Events',
    icon: Calendar,
    description: 'Talks, circles, and RSVPs',
    preview: 'RSVP to virtual and in-person sessions led by Ethiopian clinicians and facilitators.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  {
    to: '/check-in',
    label: 'Check-In',
    icon: Smile,
    description: 'Daily wellness tracker',
    preview: 'Log your mood, energy, and sleep daily.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  {
    to: '/journal',
    label: 'Journal',
    icon: BookOpen,
    description: 'Look back at your check-ins',
    preview: 'A private journal of every check-in, with what you said and what was said back to you.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
  {
    to: '/ai-assistant',
    label: 'AI Assistant',
    icon: Sparkles,
    description: 'Your postpartum guide',
    preview: 'Chat for evidence-based postpartum guidance.',
    color: 'text-brand',
    iconBg: 'bg-brand-light',
  },
]

export function isNavActive(pathname: string, to: string): boolean {
  if (to === '/') return pathname === '/'
  return pathname === to
}
