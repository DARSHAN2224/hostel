/**
 * Loading Component - Ultra Modern with Animations
 * Loading spinner and skeleton states with gradient effects
 */

import PropTypes from 'prop-types'
import { motion as Motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

export default function Loading({ 
  size = 'md',
  fullScreen = false,
  text = '',
  className = '',
  gradient = true
}) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  }

  const spinner = (
    <div className={cn('flex flex-col items-center justify-center gap-4', className)}>
      <Motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      >
        <svg
          className={cn(sizes[size])}
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          </defs>
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={gradient ? "url(#spinnerGradient)" : "currentColor"}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="220"
            strokeDashoffset="60"
            className={!gradient && "text-blue-500"}
          />
        </svg>
        {gradient && (
          <Motion.div
            className="absolute inset-0 blur-xl opacity-50"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full" />
          </Motion.div>
        )}
      </Motion.div>
      {text && (
        <Motion.p 
          className="text-sm font-medium bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </Motion.p>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <Motion.div 
        className="fixed inset-0 flex items-center justify-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {spinner}
      </Motion.div>
    )
  }

  return spinner
}

Loading.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg', 'xl']),
  fullScreen: PropTypes.bool,
  text: PropTypes.string,
  className: PropTypes.string,
  gradient: PropTypes.bool,
}

export function LoadingSkeleton({ className = '', rows = 3 }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }).map((_, i) => {
        const uniqueKey = `skeleton-${Date.now()}-${Math.random()}`
        return (
          <Motion.div
            key={uniqueKey}
            className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Motion.div
              className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
              animate={{ x: ['0%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
          </Motion.div>
        )
      })}
    </div>
  )
}

LoadingSkeleton.propTypes = {
  className: PropTypes.string,
  rows: PropTypes.number,
}

export function LoadingCard({ className = '' }) {
  return (
    <Motion.div 
      className={cn(
        'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl shadow-lg border border-slate-200/50 dark:border-slate-700/50 p-6',
        className
      )}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4">
        <Motion.div 
          className="h-6 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg w-3/4 overflow-hidden"
        >
          <Motion.div
            className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
            animate={{ x: ['0%', '200%'] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          />
        </Motion.div>
        <div className="space-y-3">
          <Motion.div 
            className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg overflow-hidden"
          >
            <Motion.div
              className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
              animate={{ x: ['0%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.2 }}
            />
          </Motion.div>
          <Motion.div 
            className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg w-5/6 overflow-hidden"
          >
            <Motion.div
              className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
              animate={{ x: ['0%', '200%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.4 }}
            />
          </Motion.div>
        </div>
      </div>
    </Motion.div>
  )
}

LoadingCard.propTypes = {
  className: PropTypes.string,
}

export function LoadingTable({ rows = 5, columns = 4 }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
        <thead className="bg-slate-50 dark:bg-slate-800/50">
          <tr>
            {Array.from({ length: columns }).map((_, i) => {
              const colKey = `col-${Date.now()}-${Math.random()}`
              return (
                <th key={colKey} className="px-6 py-4">
                  <Motion.div 
                    className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg w-24 overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Motion.div
                      className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
                      animate={{ x: ['0%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </Motion.div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
          {Array.from({ length: rows }).map((_, i) => (
            <Motion.tr 
              key={`row-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              {Array.from({ length: columns }).map((_, j) => (
                <td key={`cell-${i}-${j}`} className="px-6 py-4">
                  <Motion.div 
                    className="h-4 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 rounded-lg overflow-hidden"
                  >
                    <Motion.div
                      className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent dark:via-white/10"
                      animate={{ x: ['0%', '200%'] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    />
                  </Motion.div>
                </td>
              ))}
            </Motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

LoadingTable.propTypes = {
  rows: PropTypes.number,
  columns: PropTypes.number,
}
