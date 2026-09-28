// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://lubricentrogm.vercel.app/',
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [sitemap(), react()],
});