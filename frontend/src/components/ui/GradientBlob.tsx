import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GradientBlobProps {
  className?: string
  color?: 'abay' | 'gold' | 'purple'
  size?: 'sm' | 'md' | 'lg'
}

const colors = {
  abay: 'bg-abay-500/20',
  gold: 'bg-gold-500/15',
  purple: 'bg-purple-500/15',
}

const sizes = {
  sm: 'h-48 w-48',
  md: 'h-72 w-72',
  lg: 'h-96 w-96',
}

export function GradientBlob({ className, color = 'abay', size = 'md' }: GradientBlobProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.1, 1],
        rotate: [0, 90, 0],
      }}
      transition={{
        duration: 20,
        repeat: Infinity,
        ease: 'linear',
      }}
      className={cn(
        'pointer-events-none absolute rounded-full blur-3xl',
        colors[color],
        sizes[size],
        className
      )}
      aria-hidden="true"
    />
  )
}
