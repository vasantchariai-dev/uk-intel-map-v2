// Copies the source-of-truth JSON in data/ to public/data/, where the app
// fetches it at runtime. Runs before `npm run dev` and `npm run build`.
import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('public/data', { recursive: true });
for (const name of ['regions', 'schemes', 'assets']) await copyFile(`data/${name}.json`, `public/data/${name}.json`);
