/**
 * Input Component - Ultra Modern with Animations
 * Form input with label, icons, and error states
 */

import { motion as Motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../utils/helpers'

export default function Input({
  label,
  error,
  className = '',
  containerClassName = '',
  icon: Icon,
  iconPosition = 'left',
  required = false,
  animated = true,
  glassmorphic = false,
  ...props
}) {
  return (
    <div className={cn('w-full', containerClassName)}>
      {label && (
        <Motion.label 
          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
          initial={animated ? { opacity: 0, x: -10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.3 }}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Motion.label>
      )}
      <div className="relative">
        {Icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className={cn(
              "h-5 w-5 transition-colors duration-200",
              error ? "text-red-400" : "text-slate-400 dark:text-slate-500"
            )} />
          </div>
        )}
        <Motion.input
          className={cn(
            'w-full px-4 py-3 border rounded-xl transition-all duration-200',
            glassmorphic 
              ? 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50'
              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600',
            'text-slate-900 dark:text-white',
            'placeholder-slate-400 dark:placeholder-slate-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent',
            'disabled:bg-slate-100 dark:disabled:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60',
            error && 'border-red-500 focus:ring-red-500 dark:focus:ring-red-400',
            Icon && iconPosition === 'left' && 'pl-10',
            Icon && iconPosition === 'right' && 'pr-10',
            className
          )}
          whileFocus={animated ? { scale: 1.01 } : {}}
          {...props}
        />
        {Icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className={cn(
              "h-5 w-5 transition-colors duration-200",
              error ? "text-red-400" : "text-slate-400 dark:text-slate-500"
            )} />
          </div>
        )}
      </div>
      <AnimatePresence>
        {error && (
          <Motion.p 
            className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </Motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
