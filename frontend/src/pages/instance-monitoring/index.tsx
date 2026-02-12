 import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useAuth from '@/hooks/useAuth';
import { getApiCallsStats, getEvaluationsStats } from '@/api/dashboardApi';
import LineChartCard from '@/components/LineChartCard';

export default function InstanceMonitoringPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    apiCalls: undefined as { labels: string[]; data: number[] } | undefined,
    evaluations: undefined as { labels: string[]; data: number[] } | undefined,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getApiCallsStats(user.apiKey),
      getEvaluationsStats(user.apiKey),
    ]).then(([apiCalls, evaluations]) => {
      if (mounted) {
        setStats({ apiCalls, evaluations });
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [user.apiKey]);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-0">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-indigo-800 dark:text-gray-100 mb-2">
          Instance Monitoring
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Monitor SPACE instance usage and activity metrics
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <LineChartCard
          title="API calls (last 7 days)"
          labels={stats.apiCalls?.labels ?? []}
          data={stats.apiCalls?.data ?? []}
          color="indigo"
          loading={loading}
        />
        <LineChartCard
          title="Evaluations completed (last 7 days)"
          labels={stats.evaluations?.labels ?? []}
          data={stats.evaluations?.data ?? []}
          color="blue"
          loading={loading}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
      >
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
              Admin Access
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This page is only accessible to users with ADMIN role. The metrics shown are instance-wide and include all organizations.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
