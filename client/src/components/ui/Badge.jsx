/**
 * Badge Component - Ultra Modern with Gradients
 * Status badges for outpass and user status with animations
 */

import { motion as Motion } from 'framer-motion'
import { cn } from '../../utils/helpers'
import { STATUS_COLORS } from '../../constants'

export default function Badge({ 
  children, 
  status,
  variant = 'default',
  className = '',
  animated = true,
  icon: Icon,
  pulse = false,
  ...props 
}) {
  const Component = animated ? Motion.span : 'span'
  
  const animationProps = animated ? {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.3 }
  } : {}

  // If status is provided, use status colors
  if (status && STATUS_COLORS[status]) {
    return (
      <Component
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm',
          STATUS_COLORS[status],
          pulse && 'animate-pulse',
          className
        )}
        {...animationProps}
        {...props}
      >
        {pulse && (
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
          </span>
        )}
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {children}
      </Component>
    )
  }

  // Modern gradient variants
  const variants = {
    default: 'bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300',
    primary: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30',
    secondary: 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30',
    success: 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30',
    warning: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30',
    danger: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg shadow-red-500/30',
    info: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
  }

  return (
    <Component
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold',
        variants[variant],
        pulse && 'animate-pulse',
        className
      )}
      {...animationProps}
      {...props}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
        </span>
      )}
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {children}
    </Component>
  )
}
