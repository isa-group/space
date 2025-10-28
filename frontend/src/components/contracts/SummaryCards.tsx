// React import not required with the new JSX transform
// micro animations can be added later with framer-motion

import { MdAddToPhotos, MdOutlineWidgets } from "react-icons/md";
import { RiContractLine } from "react-icons/ri";

interface Props {
  totalContracts: number;
  totalPlans: number;
  distinctAddOnsCount: number;
}

export default function SummaryCards({ totalContracts, totalPlans, distinctAddOnsCount }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div className="p-4 bg-gradient-to-r from-white/60 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Total contracts</div>
            <div className="text-3xl font-extrabold text-indigo-700">{totalContracts}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-inner">
            <RiContractLine size={22} />
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
            <MdOutlineWidgets size={22} />
          </div>
        </div>
      </div>

      <div className="p-4 bg-white/60 dark:bg-gray-800 rounded-2xl shadow-lg backdrop-blur-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-gray-500">Distinct add-ons</div>
            <div className="text-3xl font-extrabold text-indigo-700">{distinctAddOnsCount}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-inner">
            <MdAddToPhotos size={22} />
          </div>
        </div>
      </div>
    </div>
  );
}
