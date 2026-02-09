import { useEffect, useState } from 'react';
import { FiLayers, FiFileText, FiServer, FiArrowRight, FiCalendar } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import useAuth from '../../hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import {
  getContractsCount,
  getServicesCount,
  getActivePricingsCount,
} from '@/api/dashboardApi';
import { getServices } from '@/api/services/servicesApi';
import { getContracts } from '@/api/contracts/contractsApi';
import StatCard from '@/components/StatCard';
import type { Service } from '@/types/Services';
import type { Subscription } from '@/types/Subscription';

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
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

export default function WelcomePage() {
  const { user } = useAuth();
  const { currentOrganization } = useOrganization();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    contracts: undefined as number | undefined,
    services: undefined as number | undefined,
    pricings: undefined as number | undefined,
  });
  const [services, setServices] = useState<Service[]>([]);
  const [contracts, setContracts] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrganization?.id) {
      // Reset states when no organization is selected
      setStats({ contracts: undefined, services: undefined, pricings: undefined });
      setServices([]);
      setContracts([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    
    // Reset states and start loading
    setStats({ contracts: undefined, services: undefined, pricings: undefined });
    setServices([]);
    setContracts([]);
    setLoading(true);
    
    Promise.all([
      getContractsCount(user.apiKey, currentOrganization.id),
      getServicesCount(user.apiKey, currentOrganization.id),
      getActivePricingsCount(user.apiKey, currentOrganization.id),
      getServices(user.apiKey, currentOrganization.id, { limit: 5 }),
      getContracts(user.apiKey, currentOrganization.id, { limit: 5 }),
    ]).then(([contractsCount, servicesCount, pricingsCount, servicesList, contractsResult]) => {
      if (mounted) {
        setStats({ contracts: contractsCount, services: servicesCount, pricings: pricingsCount });
        setServices(servicesList || []);
        setContracts(contractsResult.data || []);
        setLoading(false);
      }
    }).catch(err => {
      console.error('Error loading dashboard data:', err);
      if (mounted) setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [user.apiKey, currentOrganization?.id]);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-10 px-4 md:px-0">
      <div className="max-w-7xl w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-blue-400 to-purple-400 dark:from-indigo-300 dark:via-blue-300 dark:to-purple-400 mb-2">
          Welcome to SPACE
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          {currentOrganization?.name ? `Organization: ${currentOrganization.name}` : 'Select an organization to get started'}
        </p>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Managed contracts"
            value={stats.contracts ?? ''}
            icon={<FiFileText size={36} />}
            color="text-blue-500"
            loading={loading}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Configured services"
            value={stats.services ?? ''}
            icon={<FiServer size={36} />}
            color="text-indigo-500"
            loading={loading}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active pricings"
            value={stats.pricings ?? ''}
            icon={<FiLayers size={36} />}
            color="text-purple-500"
            loading={loading}
          />
        </motion.div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Recent Services */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiServer className="text-indigo-500" />
              Recent Services
            </h2>
            <button
              onClick={() => navigate('/services')}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              View all <FiArrowRight />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded-lg" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiServer className="mx-auto mb-2" size={32} />
              <p>No services yet</p>
              <button
                onClick={() => navigate('/services')}
                className="mt-3 text-sm text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                Create your first service
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service, idx) => (
                <motion.div
                  key={service.name}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => navigate(`/services/${service.name}`)}
                  className="cursor-pointer p-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-gray-700 dark:to-gray-600 rounded-lg hover:shadow-md transition-shadow border border-indigo-100 dark:border-gray-600"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-100">{service.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {Object.keys(service.activePricings || {}).length} active pricing{Object.keys(service.activePricings || {}).length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <FiArrowRight className="text-indigo-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Contracts */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <FiFileText className="text-blue-500" />
              Recent Contracts
            </h2>
            <button
              onClick={() => navigate('/contracts/dashboard')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              View all <FiArrowRight />
            </button>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-16 rounded-lg" />
              ))}
            </div>
          ) : contracts.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <FiFileText className="mx-auto mb-2" size={32} />
              <p>No contracts yet</p>
              <button
                onClick={() => navigate('/contracts/dashboard')}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                View contracts dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract, idx) => {
                const displayName = contract.userContact?.firstName && contract.userContact?.lastName
                  ? `${contract.userContact.firstName} ${contract.userContact.lastName}`
                  : contract.userContact?.username || contract.userId || 'Unknown User';
                
                return (
                  <motion.div
                    key={contract.userId || idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-lg border border-blue-100 dark:border-gray-600"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">
                          {displayName}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                          <FiCalendar size={12} />
                          <span>{formatDate(contract.billingPeriod?.startDate)}</span>
                          {contract.billingPeriod?.endDate && (
                            <>
                              <span>→</span>
                              <span>{formatDate(contract.billingPeriod.endDate)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          contract.active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {contract.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </motion.div>
      </div>
    </div>
  );
}