// React import not required with the new JSX transform
// micro animations can be added later with framer-motion

interface Props {
  totalContracts: number;
  totalPlans: number;
  activeServicesCount: number;
  totalServicesCount: number;
}

export default function SummaryCards({ totalContracts, totalPlans, activeServicesCount, totalServicesCount }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="p-4 bg-gradient-to-r from-white/60 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Total contracts</div>
            <div className="text-3xl font-extrabold text-indigo-700">{totalContracts}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 0a2 2 0 10-4 0m0 0a2 2 0 104 0" />
            </svg>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white/60 dark:bg-gray-800 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Distinct plans</div>
            <div className="text-3xl font-extrabold text-indigo-700">{totalPlans}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white/60 dark:bg-gray-800 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Active services</div>
            <div className="text-3xl font-extrabold text-indigo-700">{activeServicesCount}/{totalServicesCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c1.657 0 3-.895 3-2s-1.343-2-3-2-3 .895-3 2 1.343 2 3 2zM4 22v-2a4 4 0 014-4h8a4 4 0 014 4v2" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
