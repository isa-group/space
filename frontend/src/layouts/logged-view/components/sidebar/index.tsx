import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router';
import useAuth from '@/hooks/useAuth';
import { FiHome, FiUsers, FiServer, FiSettings, FiChevronRight, FiKey, FiActivity } from 'react-icons/fi';
import { AiOutlineDashboard } from 'react-icons/ai';
import OrganizationSelector from '@/components/OrganizationSelector';

const baseTabs = [
  { label: 'Overview', path: '/', icon: <FiHome size={22} /> },
  { label: 'Contracts Dashboard', path: '/contracts/dashboard', icon: <AiOutlineDashboard size={22}/> },
  { label: 'Members', path: '/members', icon: <FiUsers size={22} /> },
  { label: 'API Keys', path: '/api-keys', icon: <FiKey size={22} /> },
  { label: 'Services Management', path: '/services', icon: <FiServer size={22} /> },
  { label: 'Organization Settings', path: '/organization-settings', icon: <FiSettings size={22} /> },
  { label: 'Settings', path: '/settings', icon: <FiSettings size={22} /> },
];

const adminOnlyTabs = [
  { label: 'Instance Monitoring', path: '/instance-monitoring', icon: <FiActivity size={22} />, adminOnly: true },
];

function getSelectedTab(pathname: string) {
  if (pathname.startsWith('/members')) return '/members';
  if (pathname.startsWith('/api-keys')) return '/api-keys';
  if (pathname.startsWith('/services')) return '/services';
  if (pathname.startsWith('/organization-settings')) return '/organization-settings';
  if (pathname.startsWith('/settings')) return '/settings';
  if (pathname.startsWith('/contracts/dashboard')) return '/contracts/dashboard';
  if (pathname.startsWith('/instance-monitoring')) return '/instance-monitoring';
  return '/';
}

interface SidebarProps {
  readonly collapsed: boolean;
  readonly setCollapsed: (collapsed: boolean) => void;
}

export default function Sidebar({
  collapsed,
  setCollapsed,
}: SidebarProps) {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selected = getSelectedTab(location.pathname);

  // Build tabs array based on user role (robust comparison)
  const isAdmin = user?.role?.trim().toUpperCase() === 'ADMIN';
  const tabs = isAdmin ? [...baseTabs, ...adminOnlyTabs] : baseTabs;

  return (
    <motion.aside
      initial={{ width: 280 }}
      animate={{ width: collapsed ? 64 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={
        `h-screen shadow-xl border-l flex flex-col items-stretch fixed left-0 top-0 z-30 bg-white/80 border-gray-200 ` +
        `dark:bg-gray-900 dark:border-gray-800`
      }
      style={{ backdropFilter: 'blur(8px)' }}
    >
      <div className="flex flex-col items-center py-6 px-4">
        <div className="w-full flex items-center justify-between">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-widest dark:text-gray-300">
            {collapsed ? '' : `Welcome, ${user?.username ?? 'Anonymous'}`}
          </div>
          <button
            className="ml-2 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <motion.span animate={{ rotate: collapsed ? 0 : 180 }} className="inline-block">
                <FiChevronRight
                size={20}
                className="text-indigo-500 dark:text-white"
                />
            </motion.span>
          </button>
        </div>
        {!collapsed && <div className="w-full border-b border-gray-200 my-4" />}
      </div>
      
      <OrganizationSelector collapsed={collapsed} />
      
      <nav className="flex-1 flex flex-col gap-2 mt-4">
        {tabs.map(tab => (
          <button
            key={tab.path}
            className={
              `cursor-pointer flex items-center gap-3 px-5 py-3 rounded-lg font-medium transition-colors duration-200 text-gray-700 hover:bg-indigo-100 dark:text-gray-200 dark:hover:bg-gray-800 ` +
              (selected === tab.path
                ? 'bg-indigo-100 dark:bg-gray-800 font-bold' : '')
            }
            onClick={() => navigate(tab.path)}
            aria-current={selected === tab.path ? 'page' : undefined}
          >
            {tab.icon}
            {!collapsed && <span>{tab.label}</span>}
          </button>
        ))}
      </nav>
      <div className="flex-0 p-4 text-xs text-gray-400 mt-auto text-center">
        {!collapsed && <span>SPACE &copy; {new Date().getFullYear()}</span>}
      </div>
    </motion.aside>
  );
}
