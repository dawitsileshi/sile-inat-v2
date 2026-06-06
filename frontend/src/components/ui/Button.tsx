import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { motion, type HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  asMotion?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-abay-600 to-abay-500 text-white shadow-lg shadow-abay-500/25 hover:shadow-abay-500/40 hover:from-abay-500 hover:to-abay-400',
  secondary:
    'bg-gradient-to-r from-gold-500 to-gold-400 text-abay-950 shadow-lg shadow-gold-500/20 hover:shadow-gold-500/35',
  ghost:
    'bg-transparent text-abay-700 dark:text-abay-300 hover:bg-abay-500/10',
  outline:
    'border border-abay-500/30 text-abay-700 dark:text-abay-200 hover:bg-abay-500/10 hover:border-abay-500/50',
}

const sizes: Record<Size, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-sm',
  lg: 'px-8 py-3.5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asMotion = true, children, ...props }, ref) => {
    const classes = cn(
      'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-abay-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none',
      variants[variant],
      sizes[size],
      className
    )

    if (asMotion) {
      const { onAnimationStart, onDrag, onDragStart, onDragEnd, ...rest } = props
      return (
        <motion.button
          ref={ref}
          className={classes}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          {...(rest as HTMLMotionProps<'button'>)}
        >
          {children}
        </motion.button>
      )
    }

    return (
      <button ref={ref} className={classes} {...props}>
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
