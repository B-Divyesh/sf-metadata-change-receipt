import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

async function filesBelow(directory: string, relative = ''): Promise<string[]> {
  const entries = await readdir(resolve(directory, relative), { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await filesBelow(directory, child));
    else files.push(child);
  }
  return files;
}

function completeServiceWorker() {
  let outputDirectory = '';
  return {
    name: 'complete-offline-shell',
    configResolved(config: { root: string; build: { outDir: string } }) { outputDirectory = resolve(config.root, config.build.outDir); },
    async writeBundle() {
      const source = await readFile(resolve(outputDirectory, 'sw.js'), 'utf8');
      const files = (await filesBelow(outputDirectory)).filter((file) => file !== 'sw.js' && !file.endsWith('.map') && file !== 'staticwebapp.config.json').sort();
      const fingerprint = createHash('sha256');
      for (const file of files) {
        fingerprint.update(file);
        fingerprint.update(await readFile(resolve(outputDirectory, file)));
      }
      const precache = files.map((file) => `/${file}`);
      const worker = source
        .replace('__CACHE_VERSION__', fingerprint.digest('hex').slice(0, 16))
        .replace('__PRECACHE__', JSON.stringify(precache));
      await writeFile(resolve(outputDirectory, 'sw.js'), worker);
    }
  };
}

export default defineConfig({
  plugins: [completeServiceWorker()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    sourcemap: false
  },
  test: {
    include: ['src/**/*.test.ts']
  }
});
