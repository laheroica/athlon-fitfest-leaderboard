import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/'  // 👈 usar así si va directo en athlon.com.ar
  // base: '/fitfest/'  // 👈 usar así si lo vas a poner en athlon.com.ar/fitfest/
})
