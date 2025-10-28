// React import not required with the new JSX transform
import useAuth from '@/hooks/useAuth';
import useContracts from '@/hooks/useContracts';
import { useEffect, useState, useMemo } from 'react';
import { getServices, getPricingsFromService } from '@/api/services/servicesApi';
import SummaryCards from '@/components/contracts/SummaryCards';
import PlansDistributionChart from '@/components/contracts/PlansDistributionChart';
import AddonsByPlanCharts from '@/components/contracts/AddonsByPlanCharts';
// ExpectedRevenueCard removed until revenue calc is fixed
import ContractsTable from '@/components/contracts/ContractsTable';

export default function ContractsDashboard() {
  const { user } = useAuth();
  const apiKey = user?.apiKey ?? '';
  const {
    contracts,
    
    page,
    setPage,
    limit,
    setLimit,
    total,
    serviceFilter,
    setServiceFilter,
  } = useContracts(apiKey);

  const [availableServices, setAvailableServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string | undefined>(serviceFilter);
  const [availableVersions, setAvailableVersions] = useState<string[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!apiKey) return;
    getServices(apiKey).then(list => {
      const names = (list || []).map((s: any) => s.name).filter(Boolean);
      setAvailableServices(names);
      // auto-select the first service by default (do not provide an "All services" option)
      if (names.length > 0) {
        setSelectedService(prev => (prev && names.includes(prev) ? prev : names[0]));
      } else {
        setSelectedService(undefined);
      }
    }).catch(() => setAvailableServices([]));
  }, [apiKey]);

  useEffect(() => {
    // when selectedService changes, fetch its pricing versions
    if (!apiKey || !selectedService) {
      setAvailableVersions([]);
      setSelectedVersion(undefined);
      return;
    }
    getPricingsFromService(apiKey, selectedService, 'active')
      .then(pricings => {
        setAvailableVersions(pricings.map(p => p.version));
      })
      .catch(() => setAvailableVersions([]));
  }, [apiKey, selectedService]);

  // keep hook filter in sync with selectedService
  useEffect(() => {
    setServiceFilter(selectedService);
  }, [selectedService, setServiceFilter]);

  // const distinctPlans = Object.keys(plansDistribution).length; // use localPlansDistribution below (filtered)
  // Client-side filtered view so the whole dashboard reflects the selected service/version
  const filteredContracts = useMemo(() => {
    let res = contracts || [];
    if (selectedService) {
      const svc = selectedService.toLowerCase();
      res = res.filter(c => {
        const inServices = (c.services || []).some((s: any) => (s.serviceName || '').toLowerCase() === svc);
        const inMap = c.subscriptionPlans ? Object.keys(c.subscriptionPlans).some(k => k.toLowerCase() === svc) : false;
        return inServices || inMap;
      });
    }
    if (selectedVersion) {
      const ver = String(selectedVersion).replace(/^v/i, '').toLowerCase();
      res = res.filter(c => {
        return (c.services || []).some((s: any) => {
          const pv = (s.pricingVersion ?? '').toString().replace(/^v/i, '').toLowerCase();
          if (selectedService) {
            if ((s.serviceName || '').toLowerCase() !== selectedService.toLowerCase()) return false;
          }
          return pv === ver;
        });
      });
    }
    return res;
  }, [contracts, selectedService, selectedVersion]);

  const filteredTotalContracts = filteredContracts.length;

  // derive plansDistribution and addonsByPlan from filteredContracts (so the charts reflect selection)
  const { localPlansDistribution, localAddonsByPlan } = useMemo(() => {
    const map: Record<string, number> = {};
    const addonMap: Record<string, Record<string, number>> = {};
    for (const c of filteredContracts) {
      if (c.subscriptionPlans) {
        for (const [serviceName, planName] of Object.entries(c.subscriptionPlans)) {
          const plan = planName || 'unknown';
          map[plan] = (map[plan] || 0) + 1;
          const addonsForService = c.subscriptionAddOns ? (c.subscriptionAddOns as Record<string, Record<string, number>>)[serviceName] : undefined;
          if (addonsForService) {
            addonMap[plan] = addonMap[plan] || {};
            for (const [addonName, qty] of Object.entries(addonsForService || {})) {
              addonMap[plan][addonName] = (addonMap[plan][addonName] || 0) + Number(qty || 0);
            }
          }
        }
      }
      if (c.services) {
        for (const s of c.services) {
          const plan = s.subscriptionPlan ?? 'unknown';
          map[plan] = (map[plan] || 0) + 1;
          if (s.subscriptionAddOns) {
            addonMap[plan] = addonMap[plan] || {};
            for (const [addonName, qty] of Object.entries(s.subscriptionAddOns || {})) {
              addonMap[plan][addonName] = (addonMap[plan][addonName] || 0) + Number(qty || 0);
            }
          }
        }
      }
    }
    return { localPlansDistribution: map, localAddonsByPlan: addonMap };
  }, [filteredContracts]);

  const distinctPlans = Object.keys(localPlansDistribution).length;

  // compute distinct add-ons across all plans in the filtered view
  const distinctAddOnsCount = useMemo(() => {
    const set = new Set<string>();
    for (const plan of Object.keys(localAddonsByPlan || {})) {
      const addons = localAddonsByPlan[plan] || {};
      for (const addon of Object.keys(addons || {})) set.add(addon);
    }
    return set.size;
  }, [localAddonsByPlan]);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 md:px-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-indigo-800 dark:text-gray-100">Contracts Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of the active contracts, plans distribution and expected monthly revenue.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              aria-label="Select service"
              value={selectedService ?? ''}
              onChange={e => setSelectedService(e.target.value)}
              className="appearance-none px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm w-56 pr-8"
            >
              {availableServices.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 8l4 4 4-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

  <SummaryCards totalContracts={filteredTotalContracts} totalPlans={distinctPlans} distinctAddOnsCount={distinctAddOnsCount} />

      <div className="flex">
        <div className="flex-grow">
          <PlansDistributionChart data={localPlansDistribution} />
        </div>
      </div>

      <div className="mt-8">
          <div className="mt-6">
            {/* Add-on breakdown charts */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Add-ons by plan</h3>
              <div className="text-sm text-gray-500">Shows how many times each add-on was contracted per plan</div>
            </div>
            <div className="flex justify-center gap-4">
              <AddonsByPlanCharts addonsByPlan={localAddonsByPlan} plansOrder={Object.keys(localPlansDistribution)} />
            </div>
          </div>
          <div className='flex justify-evenly items-center my-8'>
            <div className='h-0.5 bg-gray-400 w-[45%]'></div>
            <div className='w-4 h-4 rounded-full border-2 border-gray-500'></div>
            <div className='h-0.5 bg-gray-400 w-[45%]'></div>
          </div>
        <ContractsTable
          contracts={filteredContracts}
          page={page}
          setPage={setPage}
          limit={limit}
          setLimit={setLimit}
          total={total}
          selectedService={selectedService}
          availableVersions={availableVersions}
          selectedVersion={selectedVersion}
          setSelectedVersion={setSelectedVersion}
        />
      </div>
    </div>
  );
}
