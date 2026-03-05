import { motion } from 'framer-motion';
import type { BillingPeriod } from '@/types/Subscription';

interface Props {
  billingPeriod?: BillingPeriod;
  createdAt?: string;
}

export default function ContractBillingSection({ billingPeriod, createdAt }: Props) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const isActive = () => {
    if (!billingPeriod?.startDate || !billingPeriod?.endDate) return false;
    const now = new Date();
    const start = new Date(billingPeriod.startDate);
    const end = new Date(billingPeriod.endDate);
    return now >= start && now <= end;
  };

  const active = isActive();
  const autoRenewal = billingPeriod?.autoRenewal ?? billingPeriod?.autoRenew ?? false;
  const renewalDays = autoRenewal ? (billingPeriod?.renewalDays ?? 'N/A') : '-';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing Information</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</label>
          <div className="mt-1">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}
            >
              {active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Created At</label>
          <p className="text-gray-900 dark:text-white mt-1">{formatDate(createdAt)}</p>
        </div>

        {billingPeriod && (
          <>
            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Start Date</label>
              <p className="text-gray-900 dark:text-white mt-1">{formatDate(billingPeriod.startDate)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">End Date</label>
              <p className="text-gray-900 dark:text-white mt-1">{formatDate(billingPeriod.endDate)}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Auto Renewal</label>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    autoRenewal
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {autoRenewal ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Renewal Days</label>
              <p className="text-gray-900 dark:text-white mt-1">{renewalDays}</p>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
