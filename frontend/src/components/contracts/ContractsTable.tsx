import { useMemo, useState } from 'react';

import type { Subscription } from '@/types/Subscription';

interface Props {
  contracts: Subscription[];
  page: number;
  setPage: (p: number) => void;
  limit: number;
  setLimit: (l: number) => void;
  total?: number;
  selectedService?: string | undefined;
  availableVersions?: string[];
  selectedVersion?: string | undefined;
  setSelectedVersion?: (v?: string) => void;
}

export default function ContractsTable({ contracts, page, setPage, limit, setLimit, total, selectedService, availableVersions, selectedVersion, setSelectedVersion }: Props) {
  const [query, setQuery] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [addOnFilter, setAddOnFilter] = useState('');

  const filtered = useMemo(() => {
    let res = contracts;
    if (query) {
      const q = query.toLowerCase();
      res = res.filter(c =>
        c.userContact?.username?.toLowerCase().includes(q) ||
        c.userContact?.email?.toLowerCase().includes(q) ||
        (c.userContact?.firstName || '').toLowerCase().includes(q) ||
        (c.userContact?.lastName || '').toLowerCase().includes(q)
      );
    }

    if (planFilter) {
      const pf = planFilter.trim().toLowerCase();
      res = res.filter(c => {
        const inServices = (c.services || []).some(s => (s.subscriptionPlan || '').toLowerCase().includes(pf));
        const inMap = c.subscriptionPlans
          ? Object.values(c.subscriptionPlans).some(v => (v || '').toLowerCase().includes(pf))
          : false;
        return inServices || inMap;
      });
    }

    if (addOnFilter) {
      const af = addOnFilter.trim().toLowerCase();
      res = res.filter(c => {
        const inServices = (c.services || []).some(s => Object.keys(s.subscriptionAddOns || {}).some(a => a.toLowerCase().includes(af)));
        const inMap = c.subscriptionAddOns
          ? Object.values(c.subscriptionAddOns).some(addonMap => Object.keys(addonMap || {}).some(a => a.toLowerCase().includes(af)))
          : false;
        return inServices || inMap;
      });
    }

    // If a specific service and version are selected, filter contracts by that service/version.
    // Note: only contracts that carry per-service entries in `c.services[]` include `pricingVersion`.
    // Contracts that express subscriptions as maps (`subscriptionPlans`) won't match by version here.
    if (selectedService && selectedVersion) {
      const sv = (selectedService || '').toLowerCase();
      const ver = (selectedVersion || '').toString().replace(/^v/i, '').trim();
      const normalize = (v: any) => (v === undefined || v === null) ? '' : String(v).replace(/^v/i, '').trim();
      res = res.filter(c => {
        const inServices = (c.services || []).some(s => {
          const nameMatch = (s.serviceName || '').toLowerCase() === sv;
          // support pricingVersion on the service entry or nested pricing.version
          const pv = normalize(s.pricingVersion);
          return nameMatch && pv === ver;
        });
        // No reliable pricingVersion in subscriptionPlans map, so we only match when services[] is available
        return inServices;
      });
    }

    return res;
  }, [contracts, query, planFilter, addOnFilter, selectedService, selectedVersion]);

  const totalPages = total ? Math.max(1, Math.ceil(total / limit)) : 1;

  return (
    <div className="mt-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-3 gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">Contracts</h3>
          <div className="text-sm text-gray-500">Filter and search contracts</div>
        </div>
        <div className="flex items-center gap-3 w-full lg:w-auto">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="px-3 py-2 border rounded w-64"
            placeholder="Search by username or email"
            aria-label="Search contracts"
          />
          <input value={planFilter} onChange={e => setPlanFilter(e.target.value)} placeholder="Filter by plan" className="px-3 py-2 border rounded w-44" />
          <input value={addOnFilter} onChange={e => setAddOnFilter(e.target.value)} placeholder="Filter by add-on" className="px-3 py-2 border rounded w-44" />
          {/* Pricing version selector for the currently selected service */}
          {availableVersions && availableVersions.length > 0 && setSelectedVersion && (
            <div className="relative">
              <select
                aria-label="Select pricing version"
                value={selectedVersion ?? ''}
                onChange={e => setSelectedVersion(e.target.value || undefined)}
                className="appearance-none px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm w-48 pr-8"
              >
                <option value="">Any version</option>
                {availableVersions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
                <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M6 8l4 4 4-4" />
                </svg>
              </div>
            </div>
          )}

          <div className="relative">
            <select
              aria-label="Select page size"
              value={limit}
              onChange={e => setLimit(Number(e.target.value))}
              className="appearance-none px-2 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm pr-8"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center">
              <svg className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M6 8l4 4 4-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 table-auto">
          <thead className="bg-gray-50 dark:bg-gray-900 rounded-t-2xl">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Username</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Services</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Billing</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c, idx) => (
              <tr key={idx} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900">
                <td className="px-4 py-3 align-top">{c.userContact?.username}</td>
                <td className="px-4 py-3 align-top">{c.userContact?.email}</td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    {/* Prefer structured services[] when available (contains pricingVersion), otherwise fallback to subscriptionPlans map keys */}
                    {Array.isArray(c.services) && c.services.length > 0 ? (
                      <>
                        {c.services.slice(0, 3).map(s => (
                          <div key={`${c.userId}-${s.serviceName}`} className="text-sm">
                            <span className="font-medium">{s.serviceName}</span>
                            <span className="text-xs text-gray-500 ml-2">{s.subscriptionPlan}</span>
                            {s.pricingVersion && <span className="text-xs text-gray-400 ml-2">v{String(s.pricingVersion)}</span>}
                          </div>
                        ))}
                        {c.services.length > 3 && <div className="text-xs text-gray-400">+{c.services.length - 3} more</div>}
                      </>
                    ) : (
                      // fallback: subscriptionPlans is a map { [serviceName]: plan }
                      Object.keys(c.subscriptionPlans || {}).slice(0, 3).map(serviceName => (
                        <div key={`${c.userId}-${serviceName}`} className="text-sm">
                          <span className="font-medium">{serviceName}</span>
                          <span className="text-xs text-gray-500 ml-2">{(c.subscriptionPlans || {})[serviceName]}</span>
                        </div>
                      ))
                    )}
                    {!Array.isArray(c.services) && Object.keys(c.subscriptionPlans || {}).length > 3 && (
                      <div className="text-xs text-gray-400">+{Object.keys(c.subscriptionPlans || {}).length - 3} more</div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top">{c.billingPeriod?.autoRenewal ? 'Auto' : c.billingPeriod?.endDate ?? '—'}</td>
                <td className="px-4 py-3 align-top text-right">
                  <button className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-sm text-gray-500">{total ? `${total} contracts` : `${contracts.length} shown`}</div>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
          <div className="px-3 py-1 border rounded">{page} / {totalPages}</div>
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  );
}
