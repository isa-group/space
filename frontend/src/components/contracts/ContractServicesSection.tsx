import { motion } from 'framer-motion';
import type { ServiceSubscription } from '@/types/Subscription';

interface Props {
  services?: ServiceSubscription[];
  subscriptionPlans?: Record<string, string>;
}

export default function ContractServicesSection({ services, subscriptionPlans }: Props) {
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

  const hasServices = Array.isArray(services) && services.length > 0;
  const hasPlans = subscriptionPlans && Object.keys(subscriptionPlans).length > 0;

  if (!hasServices && !hasPlans) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Services</h3>
        <p className="text-gray-500 dark:text-gray-400">No services available</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscribed Services</h3>

      {hasServices && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">
          {services!.map((service, idx) => (
            <motion.div
              key={`${service.serviceName}-${idx}`}
              variants={itemVariants}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">{service.serviceName}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Plan: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{service.subscriptionPlan || 'N/A'}</span>
                      </p>
                    </div>
                  </div>
                </div>
                {service.pricingVersion && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-semibold border border-indigo-200 dark:border-indigo-700">
                    v{service.pricingVersion}
                  </span>
                )}
              </div>

              {service.subscriptionAddOns && Object.keys(service.subscriptionAddOns).length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
                    </svg>
                    Add-ons
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(service.subscriptionAddOns).map(([addonName, quantity]) => (
                      <div
                        key={addonName}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700"
                      >
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{addonName}</span>
                        <span className="ml-2 px-2 py-0.5 bg-indigo-600 dark:bg-indigo-500 text-white text-xs font-bold rounded-full">
                          ×{quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      )}

      {hasPlans && !hasServices && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(subscriptionPlans!).map(([serviceName, plan]) => (
            <motion.div
              key={serviceName}
              variants={itemVariants}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-lg hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                  </svg>
                </div>
                <div>
                  <span className="font-semibold text-gray-900 dark:text-white block">{serviceName}</span>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{plan}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
