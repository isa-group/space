import { FiChevronDown } from 'react-icons/fi';

interface OrganizationsFiltersProps {
  filters: {
    search: string;
    pageSize: number;
  };
  setFilters: (f: any) => void;
}

export default function OrganizationsFilters({
  filters,
  setFilters,
}: OrganizationsFiltersProps) {
  return (
    <div className="flex flex-wrap items-end justify-start gap-4 mb-6">
      <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-300">
          Search by name
        </label>
        <input
          type="text"
          className="rounded-lg dark:border-white px-3 h-[35px] focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-900 text-indigo-500 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-300 font-medium bg-white dark:bg-gray-900 shadow-sm transition"
          placeholder="Type organization name..."
          value={filters.search}
          onChange={e => setFilters((f: any) => ({ ...f, search: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1 min-w-[90px] w-[90px]">
        <label className="text-xs font-semibold text-gray-500 dark:text-gray-300">Page size</label>
        <div className="relative">
          <select
            className="w-full pl-4 appearance-none rounded-lg dark:border-gray-800 px-2 py-2 pr-7 focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-900 font-semibold text-gray-700 dark:text-gray-100 bg-white dark:bg-gray-900 cursor-pointer shadow-sm hover:border-indigo-400 dark:hover:border-indigo-600 transition text-sm"
            value={filters.pageSize}
            onChange={e => setFilters((f: any) => ({ ...f, pageSize: Number(e.target.value) }))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <FiChevronDown
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none"
            size={16}
          />
        </div>
      </div>
    </div>
  );
}
