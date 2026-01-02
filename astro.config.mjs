// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import image from '@astrojs/image';

// https://astro.build/config
export default defineConfig({
  site: 'https://namnothere.github.io',
  // base: '/namnothere.github.io',
  integrations: [image()],
  vite: {
    plugins: [tailwindcss()]
  },
  image: {
      domains: ["astro.build", "images.unsplash.com"],
    }
});
