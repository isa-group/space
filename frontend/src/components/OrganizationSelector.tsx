import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import { useOrganization } from '@/hooks/useOrganization';

interface OrganizationSelectorProps {
  collapsed: boolean;
}

export default function OrganizationSelector({ collapsed }: OrganizationSelectorProps) {
  const { currentOrganization, organizations, switchOrganization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);

  if (!currentOrganization || organizations.length === 0) {
    return null;
  }

  if (collapsed) {
    return (
      <div className="px-4 mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <span className="text-indigo-600 dark:text-indigo-400 font-bold text-sm">
            {currentOrganization.name.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 mb-6 relative">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
        Organization
      </div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              {currentOrganization.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {currentOrganization.name}
            </div>
            {currentOrganization.default && (
              <div className="text-xs text-gray-500 dark:text-gray-400">Default</div>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <FiChevronDown className="text-gray-400" size={16} />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute left-4 right-4 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden"
            >
              <div className="max-h-60 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-md bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {org.name}
                      </div>
                      {org.default && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">Default</div>
                      )}
                    </div>
                    {currentOrganization.id === org.id && (
                      <FiCheck className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" size={16} />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
