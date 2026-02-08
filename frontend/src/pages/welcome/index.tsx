import { useEffect, useState } from 'react';
import { FiLayers, FiFileText, FiServer } from 'react-icons/fi';
import { motion } from 'framer-motion';
import useAuth from '../../hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import {
  getContractsCount,
  getServicesCount,
  getActivePricingsCount,
  getApiCallsStats,
  getEvaluationsStats,
} from '@/api/dashboardApi';
import StatCard from '@/components/StatCard';
import LineChartCard from '@/components/LineChartCard';

export default function WelcomePage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const [stats, setStats] = useState({
    contracts: undefined as number | undefined,
    services: undefined as number | undefined,
    pricings: undefined as number | undefined,
    apiCalls: undefined as { labels: string[]; data: number[] } | undefined,
    evaluations: undefined as { labels: string[]; data: number[] } | undefined,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization?.id) return;
    
    let mounted = true;
    setLoading(true);
    Promise.all([
      getContractsCount(user.apiKey, currentOrganization.id),
      getServicesCount(user.apiKey, currentOrganization.id),
      getActivePricingsCount(user.apiKey, currentOrganization.id),
      getApiCallsStats(user.apiKey),
      getEvaluationsStats(user.apiKey),
    ]).then(([contracts, services, pricings, apiCalls, evaluations]) => {
      if (mounted) {
        setStats({ contracts, services, pricings, apiCalls, evaluations });
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [user.apiKey, currentOrganization?.id]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 py-10 px-2">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-blue-400 to-purple-400 dark:from-indigo-300 dark:via-blue-300 dark:to-purple-400 drop-shadow-lg text-center mb-16"
      >
        Welcome to SPACE
      </motion.h1>
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        <StatCard
          title="Managed contracts"
          value={stats.contracts ?? ''}
          icon={<FiFileText size={36} />}
          color="text-blue-500"
          loading={loading}
        />
        <StatCard
          title="Configured services"
          value={stats.services ?? ''}
          icon={<FiServer size={36} />}
          color="text-indigo-500"
          loading={loading}
        />
        <StatCard
          title="Active pricings"
          value={stats.pricings ?? ''}
          icon={<FiLayers size={36} />}
          color="text-purple-500"
          loading={loading}
        />
      </div>
      <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
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
      </div>
    </div>
  );
}