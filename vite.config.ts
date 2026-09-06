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
      const indexPath = resolve(outputDirectory, 'index.html');
      const rootHtml = await readFile(indexPath, 'utf8');
      const pages = [
        {
          file: 'demo.html',
          title: 'Demo — Metadata Change Receipt',
          description: 'Try a five-row photo metadata change plan in an isolated demo. Review changes, exceptions, verification, and signed receipts.',
          url: 'https://metadata-change-receipt.sociobot.in/demo'
        },
        {
          file: 'privacy.html',
          title: 'Privacy — Metadata Change Receipt',
          description: 'Learn which metadata stays in your browser and when license checks contact the Sociobot billing service.',
          url: 'https://metadata-change-receipt.sociobot.in/privacy'
        },
        {
          file: 'terms.html',
          title: 'Terms — Metadata Change Receipt',
          description: 'Read the limits, receipt trust model, purchase terms, and responsibilities for Metadata Change Receipt.',
          url: 'https://metadata-change-receipt.sociobot.in/terms'
        }
      ];
      for (const page of pages) {
        const html = rootHtml
          .replace(/<title>[^<]*<\/title>/u, `<title>${page.title}</title>`)
          .replace(/(<meta name="description" content=")[^"]*(" \/>)/u, `$1${page.description}$2`)
          .replace(/(<link rel="canonical" href=")[^"]*(" \/>)/u, `$1${page.url}$2`)
          .replace(/(<meta property="og:title" content=")[^"]*(" \/>)/u, `$1${page.title}$2`)
          .replace(/(<meta property="og:description" content=")[^"]*(" \/>)/u, `$1${page.description}$2`)
          .replace(/(<meta property="og:url" content=")[^"]*(" \/>)/u, `$1${page.url}$2`)
          .replace(/(<meta name="twitter:title" content=")[^"]*(" \/>)/u, `$1${page.title}$2`)
          .replace(/(<meta name="twitter:description" content=")[^"]*(" \/>)/u, `$1${page.description}$2`)
          .replace(/\s*<link rel="preload"[^>]+>/u, '');
        await writeFile(resolve(outputDirectory, page.file), html);
      }
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
