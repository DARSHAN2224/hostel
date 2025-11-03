/**
 * EmptyState Component - Ultra Modern with Animations
 * Display when there's no data with gradient effects
 */

import { motion as Motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  animated = true
}) {
  return (
    <Motion.div 
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        className
      )}
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
    >
      {Icon && (
        <Motion.div 
          className="relative mb-6"
          initial={animated ? { scale: 0 } : {}}
          animate={animated ? { scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 0.2, type: 'spring', stiffness: 200 }}
        >
          {/* Gradient background glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-2xl opacity-20 animate-pulse" />
          
          {/* Icon container */}
          <div className="relative rounded-full bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10 p-8 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50">
            <Icon className="h-16 w-16 text-slate-400 dark:text-slate-500" />
          </div>
        </Motion.div>
      )}
      
      {title && (
        <Motion.h3 
          className="text-2xl font-display font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-3"
          initial={animated ? { opacity: 0, y: 10 } : {}}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {title}
        </Motion.h3>
      )}
      
      {description && (
        <Motion.p 
          className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-md mb-8"
          initial={animated ? { opacity: 0, y: 10 } : {}}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {description}
        </Motion.p>
      )}
      
      {action && (
        <Motion.div
          initial={animated ? { opacity: 0, y: 10 } : {}}
          animate={animated ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          {action}
        </Motion.div>
      )}
    </Motion.div>
  )
}
