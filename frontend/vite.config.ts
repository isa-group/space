import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ''); 
  
  const basePath = env.VITE_FRONTEND_BASE_PATH || "/";
  const finalBase = basePath.startsWith('/') ? basePath : `/${basePath}`;
  const safeBase = finalBase.endsWith('/') ? finalBase : `${finalBase}/`;

  console.log(`Using base path: ${safeBase}`);

  return {
    base: safeBase,
    plugins: [
      react(),
      tailwindcss(),
      tsconfigPaths()
    ],
  }
})