import { motion } from 'framer-motion';

interface SpaceCardProps {
  children: React.ReactNode;
  image?: string;
  imageAlt?: string;
}

export default function SpaceCard({ children, image, imageAlt }: SpaceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, type: 'spring', bounce: 0.3 }}
      className="bg-white/90 dark:bg-gray-900/90 shadow-2xl rounded-3xl flex flex-col md:flex-row items-center w-full max-w-3xl border border-indigo-100 dark:border-gray-700 backdrop-blur-md p-0 md:p-0 overflow-hidden"
      style={{ minHeight: '420px' }}
    >
      {image && (
        <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-blue-100 via-indigo-100 to-purple-100 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900 h-full w-1/2 min-h-[420px]">
          <img
            src={image}
            alt={imageAlt || 'Login illustration'}
            className="object-contain w-full h-full"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex-1 w-full flex flex-col items-center justify-center px-6 py-8 sm:px-10 sm:py-10">
        {children}
      </div>
    </motion.div>
  );
}
