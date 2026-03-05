import { motion } from 'framer-motion';
import type { UserContact } from '@/types/Subscription';

interface Props {
  userContact?: UserContact;
}

export default function ContractUserSection({ userContact }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Username</label>
          <p className="text-gray-900 dark:text-white mt-1">{userContact?.username || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</label>
          <p className="text-gray-900 dark:text-white mt-1">{userContact?.email || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">First Name</label>
          <p className="text-gray-900 dark:text-white mt-1">{userContact?.firstName || 'N/A'}</p>
        </div>
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Last Name</label>
          <p className="text-gray-900 dark:text-white mt-1">{userContact?.lastName || 'N/A'}</p>
        </div>
      </div>
    </motion.div>
  );
}
