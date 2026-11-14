import { defineConfig } from 'vite';

// Relative paths, so the build works at a domain root (Vercel, Netlify)
// and in a sub-folder (GitHub Pages).
export default defineConfig({ base: './' });
