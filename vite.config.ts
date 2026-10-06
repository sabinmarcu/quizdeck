import react from '@vitejs/plugin-react';
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin';
import { embedThemeManifests } from '@sabinmarcu/theme-core';
import {
  defineConfig,
  loadEnv,
} from 'vite';
import { z } from 'zod';
import { themeInputs } from './src/web/theme';
import { createAppThemeSetup } from './src/web/theme-setup';

const envSchema = z.object({
  VITE_ALLOWED_HOSTS: z.string().default('').transform((value) => value
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)),
});

export default defineConfig(({ mode }) => {
  const env = envSchema.parse(loadEnv(mode, process.cwd(), 'VITE_ALLOWED_HOSTS'));

  return {
    plugins: [
      react(),
      vanillaExtractPlugin(),
      {
        name: 'quizdeck-theme',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            const setup = createAppThemeSetup();
            setup(themeInputs);
            return html.replace('</head>', [
              setup.stylesheet.raw,
              embedThemeManifests([setup.manifest()]),
              '</head>',
            ].join('\n'));
          },
        },
      },
    ],
    server: {
      allowedHosts: env.VITE_ALLOWED_HOSTS,
    },
    build: {
      outDir: 'dist/web',
      target: 'esnext',
    },
  };
});
