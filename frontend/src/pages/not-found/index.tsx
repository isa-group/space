import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { FiAlertCircle, FiHome } from 'react-icons/fi';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center px-4"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100 dark:bg-red-900/30 mb-6"
        >
          <FiAlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
        </motion.div>

        <h1 className="text-6xl font-extrabold text-gray-800 dark:text-gray-100 mb-4">
          404
        </h1>
        
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-3">
          Page Not Found
        </h2>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or you don't have permission to access it.
        </p>

        <button
          onClick={() => navigate('/')}
          className="cursor-pointer inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md transition-all hover:shadow-lg"
        >
          <FiHome size={20} />
          Go to Home
        </button>
      </motion.div>
    </div>
  );
}
