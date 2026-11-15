import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';

// Optional password screen. Set SITE_PASSWORD when building; only its SHA-256
// hash goes into the bundle. It is a deterrent, not security: the data files
// are public and can be fetched directly.
const password = process.env.SITE_PASSWORD ?? '';
const passwordHash = password ? createHash('sha256').update(password).digest('hex') : '';

// Relative paths, so the build works at a domain root (Vercel, Netlify)
// and in a sub-folder (GitHub Pages).
export default defineConfig({
  base: './',
  define: { __PASSWORD_HASH__: JSON.stringify(passwordHash) },
});
