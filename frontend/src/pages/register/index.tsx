import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import SpaceCard from '../../components/space-card';
import LightBackground from '../../layouts/background';
import loginImage from '../../static/images/login-image.webp';
import FormError from '../../components/FormError';
import { registerUser } from '@/api/users/usersApi';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await registerUser({ username, password });
      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <LightBackground>
      <SpaceCard image={loginImage} imageAlt="Register illustration">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.7, type: 'spring' }}
          className="text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-blue-400 to-purple-400 dark:from-indigo-300 dark:via-blue-300 dark:to-purple-400 mb-6 drop-shadow-lg text-center"
        >
          Join SPACE
        </motion.h1>
        <motion.form
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="w-full flex flex-col gap-6"
          onSubmit={handleRegister}
        >
          {success ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-700 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg"
            >
              Registration successful! Redirecting to login...
            </motion.div>
          ) : (
            <>
              <FormError message={error} />
              <div>
                <label className="block text-indigo-800 dark:text-indigo-200 text-sm font-bold mb-2" htmlFor="username">
                  Username
                </label>
                <input
                  className="shadow appearance-none border border-indigo-200 dark:border-gray-700 rounded-lg w-full py-2 px-3 text-indigo-900 dark:text-gray-100 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-indigo-800 focus:border-blue-300 dark:focus:border-indigo-700 bg-white/80 dark:bg-gray-900/80 placeholder-indigo-300 dark:placeholder-gray-500 transition-all"
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-indigo-800 dark:text-indigo-200 text-sm font-bold mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  className="shadow appearance-none border border-indigo-200 dark:border-gray-700 rounded-lg w-full py-2 px-3 text-indigo-900 dark:text-gray-100 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-indigo-800 focus:border-blue-300 dark:focus:border-indigo-700 bg-white/80 dark:bg-gray-900/80 placeholder-indigo-300 dark:placeholder-gray-500 transition-all"
                  id="password"
                  type="password"
                  placeholder="Choose a password (min 5 characters)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-indigo-800 dark:text-indigo-200 text-sm font-bold mb-2" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  className="shadow appearance-none border border-indigo-200 dark:border-gray-700 rounded-lg w-full py-2 px-3 text-indigo-900 dark:text-gray-100 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-indigo-800 focus:border-blue-300 dark:focus:border-indigo-700 bg-white/80 dark:bg-gray-900/80 placeholder-indigo-300 dark:placeholder-gray-500 transition-all"
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className="cursor-pointer mt-2 bg-gradient-to-r from-indigo-400 via-blue-400 to-purple-400 dark:from-indigo-600 dark:via-blue-700 dark:to-purple-700 hover:from-indigo-300 hover:to-purple-300 dark:hover:from-indigo-500 dark:hover:to-purple-500 text-white font-bold py-2 px-6 rounded-lg shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:focus:ring-indigo-800 focus:ring-offset-2"
                type="submit"
              >
                Register
              </motion.button>
              <div className="text-center mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-sm font-medium transition-colors"
                >
                  Already have an account? Log in
                </button>
              </div>
            </>
          )}
        </motion.form>
      </SpaceCard>
    </LightBackground>
  );
}
