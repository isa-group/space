import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuth from '@/hooks/useAuth';
import { createUser } from '@/api/users/usersApi';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

const ROLES = ['ADMIN', 'USER'];
const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'text-red-700',
  USER: 'text-blue-700',
};
const ROLE_BG_HOVER: Record<string, string> = {
  ADMIN: 'hover:bg-red-100',
  USER: 'hover:bg-blue-100',
};

export default function AddUserModal({ open, onClose, onUserCreated }: { open: boolean; onClose: () => void; onUserCreated: () => void }) {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [role, setRole] = useState('USER');
  const [roleDropdown, setRoleDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const availableRoles = ROLES;

  const validate = async () => {
    if (!username || !password || !password2) {
      setError('All fields are required.');
      return false;
    }
    if (username.length < 6) {
      setError('Username must be at least 6 characters.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (password !== password2) {
      setError('Passwords do not match.');
      return false;
    }
    
    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const valid = await validate();
    if (!valid) {
      setLoading(false);
      return;
    }
    try {
      await createUser(user.apiKey, { username, password, role: role as any });
      setUsername('');
      setPassword('');
      setPassword2('');
      setRole('USER');
      onUserCreated();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60"
        >
          <motion.form
            initial={{ scale: 0.97, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-10 max-w-md w-full flex flex-col items-center border border-indigo-100 dark:border-gray-800"
            onSubmit={handleSubmit}
          >
            <h2 className="text-2xl font-bold text-indigo-800 dark:text-white mb-6">Add new user</h2>
            <div className="w-full flex flex-col gap-4">
              {/* Username */}
              <input
                className="rounded-lg border border-indigo-300 dark:border-white text-indigo-500 dark:text-white placeholder-indigo-300 dark:placeholder-gray-400 px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white focus:border-indigo-500 dark:bg-gray-800 bg-white transition"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
              {/* Passwords en la misma fila */}
              <div className="flex flex-col sm:flex-row gap-4 w-full">
                <input
                  type="password"
                  className="rounded-lg border border-indigo-300 dark:border-white text-indigo-500 dark:text-white placeholder-indigo-300 dark:placeholder-gray-400 px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white focus:border-indigo-500 dark:bg-gray-800 bg-white transition"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <input
                  type="password"
                  className="rounded-lg border border-indigo-300 dark:border-white text-indigo-500 dark:text-white placeholder-indigo-300 dark:placeholder-gray-400 px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white focus:border-indigo-500 dark:bg-gray-800 bg-white transition"
                  placeholder="Repeat password"
                  value={password2}
                  onChange={e => setPassword2(e.target.value)}
                />
              </div>
              {/* Selector de rol custom */}
              <div className="relative w-full">
                <button
                  type="button"
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border border-indigo-300 dark:border-white bg-white dark:bg-gray-800 text-indigo-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-white transition cursor-pointer ${ROLE_COLORS[role]}`}
                  onClick={() => setRoleDropdown(v => !v)}
                  tabIndex={0}
                >
                  <span>{role}</span>
                  {roleDropdown ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
                </button>
                <AnimatePresence>
                  {roleDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ type: 'spring', duration: 0.18 }}
                      className="absolute left-0 mt-2 w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border dark:border-gray-700 z-50 overflow-hidden"
                    >
                      {availableRoles.map(r => (
                        <button
                          key={r}
                          type="button"
                          className={`w-full text-left px-4 py-2 text-sm font-medium bg-white dark:bg-gray-800 text-indigo-800 dark:text-white ${ROLE_COLORS[r]} ${ROLE_BG_HOVER[r]} cursor-pointer transition`}
                          onClick={() => { setRole(r); setRoleDropdown(false); }}
                          onMouseDown={e => e.preventDefault()}
                        >
                          {r}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="w-full mt-4 text-xs text-red-500 text-center"
              >
                {error}
              </motion.div>
            )}
            <div className="flex gap-2 w-full mt-6">
              <button
                type="button"
                className="flex-1 px-4 py-2 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-200 font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition cursor-pointer"
                onClick={onClose}
                disabled={loading}
              >Cancel</button>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="flex-1 px-4 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700 dark:hover:bg-indigo-800 transition cursor-pointer disabled:opacity-50"
                disabled={loading}
              >{loading ? 'Adding...' : 'Add user'}</motion.button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
