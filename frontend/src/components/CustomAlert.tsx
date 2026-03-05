import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import type { ReactNode } from 'react';

export type CustomAlertType = 'success' | 'info' | 'warning' | 'danger';

interface CustomAlertProps {
  message: string;
  onClose: () => void;
  type?: CustomAlertType;
}

export default function CustomAlert({ message, onClose, type = 'info' }: CustomAlertProps) {
  // Prevent background scroll when alert is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Icono y color según tipo
  let icon: ReactNode = null;
  let color = '';
  let border = '';
  let bg = '';
  let hover = '';
  switch (type) {
    case 'success':
      icon = (
        <svg
          className="w-10 h-10 text-green-400 dark:text-green-300 mb-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
      color = 'text-green-700 dark:text-green-200';
      border = 'border-green-200 dark:border-green-500';
      bg = 'bg-green-500 dark:bg-green-600';
      hover = 'hover:bg-green-600 dark:hover:bg-green-700';
      break;
    case 'danger':
      icon = (
        <svg
          className="w-10 h-10 text-red-400 dark:text-red-300 mb-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
        </svg>
      );
      color = 'text-red-700 dark:text-red-200';
      border = 'border-red-200 dark:border-red-500';
      bg = 'bg-red-500 dark:bg-red-600';
      hover = 'hover:bg-red-600 dark:hover:bg-red-700';
      break;
    case 'warning':
      icon = (
        <svg
          className="w-10 h-10 text-yellow-600 dark:text-yellow-400 mb-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01M10.29 3.86l-8.09 14A2 2 0 004 21h16a2 2 0 001.8-3.14l-8.09-14a2 2 0 00-3.42 0z"
          />
        </svg>
      );
      color = 'text-yellow-700 dark:text-yellow-200';
      border = 'border-yellow-200 dark:border-yellow-500';
      bg = 'bg-yellow-500 dark:bg-yellow-600';
      hover = 'hover:bg-yellow-600 dark:hover:bg-yellow-700';
      break;
    default:
      icon = (
        <svg
          className="w-10 h-10 text-indigo-400 dark:text-indigo-300 mb-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
        </svg>
      );
      color = 'text-indigo-700 dark:text-indigo-200';
      border = 'border-indigo-200 dark:border-indigo-500';
      bg = 'bg-indigo-500 dark:bg-indigo-600';
      hover = 'hover:bg-indigo-600 dark:hover:bg-indigo-700';
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', duration: 0.3 }}
          className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-sm w-full flex flex-col items-center border ${border}`}
        >
          <div className="flex flex-col items-center gap-2">
            {icon}
            <div className={`text-center text-base font-medium ${color}`}>{message}</div>
            <button
              className={`cursor-pointer mt-4 px-6 py-2 rounded-lg font-semibold shadow-sm transition ${bg} text-white ${hover}`}
              onClick={onClose}
              autoFocus
            >
              OK
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
