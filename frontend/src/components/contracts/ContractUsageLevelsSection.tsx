import { motion } from 'framer-motion';
import type { UsageLevel } from '@/types/Subscription';

interface Props {
  usageLevels?: Record<string, Record<string, UsageLevel>>;
}

export default function ContractUsageLevelsSection({ usageLevels }: Props) {
  if (!usageLevels || Object.keys(usageLevels).length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Levels</h3>
        <p className="text-gray-500 dark:text-gray-400">No usage data available</p>
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
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getProgressPercentage = (consumed?: number, limit?: number) => {
    if (!consumed || !limit) return 0;
    return Math.min((consumed / limit) * 100, 100);
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500 dark:bg-red-600';
    if (percentage >= 75) return 'bg-yellow-500 dark:bg-yellow-600';
    return 'bg-green-500 dark:bg-green-600';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Usage Levels</h3>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
        {Object.entries(usageLevels).map(([serviceName, levels]) => (
          <motion.div
            key={serviceName}
            variants={itemVariants}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-base font-semibold text-gray-900 dark:text-white capitalize">{serviceName}</h4>
              <span className="px-2.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-medium">
                {Object.keys(levels).length} metric{Object.keys(levels).length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-4">
              {Object.entries(levels).map(([metricName, usageData]) => {
                const percentage = getProgressPercentage(usageData.consumed, usageData.limit);
                const hasLimit = usageData.limit !== undefined && usageData.limit !== null;

                return (
                  <div key={metricName} className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {metricName.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        {usageData.resetTimeStamp && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Reset: {formatDate(usageData.resetTimeStamp)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {usageData.consumed ?? 0}
                          {hasLimit && <span className="text-sm font-normal text-gray-500 dark:text-gray-400"> / {usageData.limit}</span>}
                        </p>
                        {hasLimit && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {percentage.toFixed(1)}% used
                          </p>
                        )}
                      </div>
                    </div>

                    {hasLimit && (
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full ${getProgressColor(percentage)} transition-colors`}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}
