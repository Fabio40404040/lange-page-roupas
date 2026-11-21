
import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  // O Cloudflare Pages publica a loja na raiz do domínio.
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Imagens do catálogo inicial continuam como arquivos públicos.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        loja: resolve(projectRoot, 'index.html'),
        admin: resolve(projectRoot, 'admin.html')
      }
    }
  }
});
