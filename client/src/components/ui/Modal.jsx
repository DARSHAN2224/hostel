/**
 * Modal Component - Ultra Modern with Glassmorphism
 * Reusable modal dialog with smooth animations
 */

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { motion as Motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { cn } from '../../utils/helpers'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  gradient = false
}) {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-7xl'
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className={cn(
                  'w-full transform overflow-hidden rounded-2xl',
                  'bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl',
                  'border border-slate-200/50 dark:border-slate-700/50',
                  'text-left align-middle shadow-2xl transition-all',
                  sizes[size]
                )}
              >
                {title && (
                  <Motion.div 
                    className={cn(
                      'flex items-center justify-between p-6',
                      gradient 
                        ? 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
                        : 'border-b border-slate-200 dark:border-slate-700'
                    )}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center gap-3">
                      {gradient && <SparklesIcon className="h-6 w-6 text-white" />}
                      <Dialog.Title
                        as="h3"
                        className={cn(
                          'text-xl font-display font-bold',
                          gradient 
                            ? 'text-white'
                            : 'text-slate-900 dark:text-white'
                        )}
                      >
                        {title}
                      </Dialog.Title>
                    </div>
                    {showClose && (
                      <Motion.button
                        type="button"
                        className={cn(
                          'rounded-xl p-2 transition-colors duration-200',
                          gradient
                            ? 'text-white hover:bg-white/20'
                            : 'text-slate-400 hover:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        )}
                        onClick={onClose}
                        whileHover={{ scale: 1.1, rotate: 90 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </Motion.button>
                    )}
                  </Motion.div>
                )}
                <Motion.div 
                  className="p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  {children}
                </Motion.div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}

export function ModalFooter({ children, className = '' }) {
  return (
    <Motion.div 
      className={cn(
        'mt-6 pt-4 border-t border-slate-200 dark:border-slate-700',
        'flex items-center justify-end gap-3',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {children}
    </Motion.div>
  )
}
