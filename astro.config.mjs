// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://lubricentrogm.cl',
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  image:
      { domains: ["gormxrgwobexytbfsxmd.supabase.co"], },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [sitemap(), react()],
});