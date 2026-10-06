import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import {
  defineConfig,
  loadEnv,
} from 'vite';
import { z } from 'zod';

const envSchema = z.object({
  VITE_ALLOWED_HOSTS: z.string().default('').transform((value) => value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)),
});

export default defineConfig(({ mode }) => {
  const env = envSchema.parse(loadEnv(mode, process.cwd(), 'VITE_ALLOWED_HOSTS'));

  return {
    plugins: [react(), vanillaExtractPlugin()],
    server: {
      allowedHosts: env.VITE_ALLOWED_HOSTS,
    },
    build: {
      outDir: 'dist/web',
      target: 'esnext',
    },
  };
});
