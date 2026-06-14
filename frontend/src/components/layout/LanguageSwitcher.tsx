import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n'

// Two-pill toggle: EN / አማ. Kept compact so it survives the narrow navbar
// alongside the nav links and account chip. Mobile drawer renders the same
// switcher larger via the `wide` variant.
const LABELS: Record<SupportedLang, string> = {
  en: 'EN',
  am: 'አማ',
}

export function LanguageSwitcher({ wide = false }: { wide?: boolean }) {
  const { i18n } = useTranslation()
  const current = (SUPPORTED_LANGS as readonly string[]).includes(i18n.language)
    ? (i18n.language as SupportedLang)
    : 'en'

  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-stone-100/80 p-1',
        wide && 'w-full justify-center gap-1 p-1.5',
      )}
      role="group"
      aria-label="Language"
    >
      <Globe className={cn('ml-1 h-3.5 w-3.5 text-text-muted', wide && 'h-4 w-4')} aria-hidden />
      {SUPPORTED_LANGS.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          className={cn(
            'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
            wide && 'px-4 py-1.5 text-sm',
            current === lng
              ? 'bg-white text-text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary',
          )}
        >
          {LABELS[lng]}
        </button>
      ))}
    </div>
  )
}
