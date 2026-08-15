import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // chemins relatifs : le site marche aussi bien a la racine d'un domaine
  // que dans un sous-dossier (GitHub Pages, etc.)
  base: './',
  server: {
    port: 5173,
    host: true, // accessible depuis le telephone sur le meme wifi
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
