/**
 * Card Component - Ultra Modern with Glassmorphism
 * Reusable card container with animations and gradient effects
 */

import { motion as Motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

export default function Card({ 
  children, 
  className = '', 
  padding = true,
  hover = false,
  glassmorphic = false,
  gradient = false,
  animated = true,
  ...props 
}) {
  const Component = animated ? Motion.div : 'div'
  
  const animationProps = animated ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 },
    whileHover: hover ? { y: -4, scale: 1.01 } : {}
  } : {}

  return (
    <Component
      className={cn(
        'rounded-2xl shadow-lg border transition-all duration-300',
        glassmorphic 
          ? 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        padding && 'p-6',
        hover && 'hover:shadow-xl cursor-pointer',
        gradient && 'relative overflow-hidden',
        className
      )}
      {...animationProps}
      {...props}
    >
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />
      )}
      <div className="relative">
        {children}
      </div>
    </Component>
  )
}

export function CardHeader({ children, className = '', gradient = false }) {
  return (
    <div className={cn('mb-4', className)}>
      {gradient ? (
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          {children}
        </div>
      ) : children}
    </div>
  )
}

export function CardTitle({ children, className = '', gradient = false }) {
  return (
    <h3 
      className={cn(
        'text-xl font-display font-bold',
        gradient 
          ? 'bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'
          : 'text-slate-900 dark:text-white',
        className
      )}
    >
      {children}
    </h3>
  )
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={cn('text-slate-700 dark:text-slate-300', className)}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={cn(
      'mt-6 pt-4 border-t border-slate-200 dark:border-slate-700',
      'flex items-center justify-end gap-3',
      className
    )}>
      {children}
    </div>
  )
}
