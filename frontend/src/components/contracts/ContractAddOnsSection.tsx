import { motion } from 'framer-motion';

interface Props {
  subscriptionAddOns?: Record<string, Record<string, number>>;
}

export default function ContractAddOnsSection({ subscriptionAddOns }: Props) {
  if (!subscriptionAddOns || Object.keys(subscriptionAddOns).length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add-ons Summary</h3>
        <p className="text-gray-500 dark:text-gray-400">No add-ons contracted</p>
      </motion.div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  // Calculate totals for summary
  const allAddOns: Record<string, number> = {};
  for (const serviceAddOns of Object.values(subscriptionAddOns)) {
    for (const [addonName, quantity] of Object.entries(serviceAddOns || {})) {
      allAddOns[addonName] = (allAddOns[addonName] || 0) + Number(quantity || 0);
    }
  }

  const totalAddOns = Object.values(allAddOns).reduce((sum, qty) => sum + qty, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add-ons Summary</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total contracted add-ons across all services</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{totalAddOns}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Total Units</div>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-5">
        {Object.entries(subscriptionAddOns).map(([serviceName, addOns]) => (
          <motion.div
            key={serviceName}
            variants={itemVariants}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-gray-900 dark:text-white capitalize">{serviceName}</h4>
              </div>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-semibold">
                {Object.keys(addOns || {}).length} add-on{Object.keys(addOns || {}).length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Object.entries(addOns || {}).map(([addonName, quantity]) => (
                <motion.div
                  key={addonName}
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col p-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600 transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 line-clamp-2 flex-1">
                      {addonName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Quantity:</span>
                    <span className="px-2.5 py-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-bold rounded-full shadow-sm">
                      ×{quantity}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Global summary section */}
      {Object.keys(subscriptionAddOns).length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
        >
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
            Global Add-ons Distribution
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {Object.entries(allAddOns)
              .sort(([, a], [, b]) => b - a)
              .map(([addonName, totalQuantity]) => (
                <div
                  key={addonName}
                  className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-700"
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="text-sm font-semibold text-indigo-900 dark:text-indigo-200 truncate">{addonName}</div>
                    <div className="text-xs text-indigo-700 dark:text-indigo-400">Across all services</div>
                  </div>
                  <div className="px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-bold rounded-full shadow-sm">
                    {totalQuantity}
                  </div>
                </div>
              ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
