/**
 * Table Component - Ultra Modern with Glassmorphism
 * Reusable table with animations and responsive design
 */

import PropTypes from 'prop-types'
import { motion as Motion } from 'framer-motion'
import { cn } from '../../utils/helpers'

export default function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className={cn(
        'min-w-full divide-y divide-slate-200 dark:divide-slate-700',
        className
      )}>
        {children}
      </table>
    </div>
  )
}

Table.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

export function TableHeader({ children, className = '', gradient = false }) {
  return (
    <thead className={cn(
      gradient 
        ? 'bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10'
        : 'bg-slate-50 dark:bg-slate-800/50',
      className
    )}>
      {children}
    </thead>
  )
}

TableHeader.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  gradient: PropTypes.bool,
}

export function TableBody({ children, className = '', glassmorphic = false }) {
  return (
    <tbody className={cn(
      'divide-y divide-slate-200 dark:divide-slate-700',
      glassmorphic 
        ? 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl'
        : 'bg-white dark:bg-slate-800',
      className
    )}>
      {children}
    </tbody>
  )
}

TableBody.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  glassmorphic: PropTypes.bool,
}

export function TableRow({ 
  children, 
  className = '', 
  hover = true, 
  animated = true,
  index = 0,
  ...props 
}) {
  const Component = animated ? Motion.tr : 'tr'
  
  const animationProps = animated ? {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.3, delay: index * 0.05 },
    whileHover: hover ? { 
      backgroundColor: 'rgba(59, 130, 246, 0.05)',
      scale: 1.005,
      transition: { duration: 0.2 }
    } : {}
  } : {}

  return (
    <Component 
      className={cn(
        'transition-all duration-200',
        hover && !animated && 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
        className
      )}
      {...animationProps}
      {...props}
    >
      {children}
    </Component>
  )
}

TableRow.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
  hover: PropTypes.bool,
  animated: PropTypes.bool,
  index: PropTypes.number,
}

export function TableHead({ children, className = '', ...props }) {
  return (
    <th
      className={cn(
        'px-6 py-4 text-left text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider',
        className
      )}
      {...props}
    >
      {children}
    </th>
  )
}

TableHead.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}

export function TableCell({ children, className = '', ...props }) {
  return (
    <td
      className={cn(
        'px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white',
        className
      )}
      {...props}
    >
      {children}
    </td>
  )
}

TableCell.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
}
