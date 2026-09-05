import { defineConfig } from 'vite';
// BASE is set by the GitHub Pages workflow (/rollrumbler/); locally and on other hosts it stays /.
export default defineConfig({ base: process.env.BASE || '/', build: { target: 'es2020' }, server: { host: true } });
