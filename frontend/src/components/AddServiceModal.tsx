import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Service } from '@/types/Services';
import { createService } from '@/api/services/servicesApi';
import useAuth from '@/hooks/useAuth';
import { useOrganization } from '@/hooks/useOrganization';
import FileOrUrlInput from './FileOrUrlInput';

interface AddServiceModalProps {
  open: boolean;
  onClose: (service?: Service) => void;
}

export default function AddServiceModal({ open, onClose }: AddServiceModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  // drag/drop state and input ref handled inside FileOrUrlInput

  const { user } = useAuth();
  const { currentOrganization } = useOrganization();

  // file validation is handled inside FileOrUrlInput; only state updates are used here

  // file drag/drop handlers moved to FileOrUrlInput

  const handleUpload = () => {
    if (!currentOrganization) {
      setError('Please select an organization first.');
      return;
    }

    // Either a file or a valid URL must be provided
    if (!file && !url) {
      setError('Please select a .yml/.yaml file or provide a valid URL.');
      return;
    }

    // If URL provided, validate it
    if (!file && url) {
      try {
        new URL(url);
      } catch (_) {
        setError('Please provide a valid URL.');
        return;
      }
    }

    setError('');
    const payload: File | string = file ?? url;

    createService(user.apiKey, currentOrganization.id, payload)
      .then((service: Service) => {
        setFile(null);
        setUrl('');
        onClose(service);
      })
      .catch((err: Error) => {
        setError(err.message);
      });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center border border-indigo-100 dark:border-gray-800"
          >
            <h2 className="text-xl font-bold text-indigo-700 dark:text-gray-100 mb-2">Add New Service</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-center">
              Upload a YAML file (.yml or .yaml) to add a new service and its pricing versions.
            </p>
            <FileOrUrlInput
              file={file}
              url={url}
              onFileChange={f => setFile(f)}
              onUrlChange={u => {
                setUrl(u);
                if (u) setFile(null);
              }}
              error={error}
            />
            <div className="flex gap-3 mt-4 w-full">
              <button
                className="cursor-pointer flex-1 px-4 py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold hover:bg-gray-300 dark:hover:bg-gray-700 transition"
                onClick={() => {
                  onClose(undefined);
                }}
              >
                Cancel
              </button>
              <button
                className="cursor-pointer flex-1 px-4 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-800 transition"
                onClick={handleUpload}
              >
                Upload
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
