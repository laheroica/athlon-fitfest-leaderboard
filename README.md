# Athlon Fit Festival — Leaderboard (React + Vite, sin backend)

## Requisitos
- Node.js 18+
- (Opcional) Vercel CLI para deploy

## Instalación
```bash
npm i
npm run dev
```
Abrí http://localhost:5173

## Modo Admin
La edición solo se habilita si entrás con la URL:
`http://localhost:5173/?admin=athlon`
(podés cambiar la clave en `src/App.jsx` -> `ADMIN_KEY`).

## Export/Import
- Exporta un JSON con todos los resultados (botón "Exportar JSON").
- Podés importarlo en otra máquina con "Importar JSON".

## Deploy (Vercel)
```bash
npm run build
npx vercel deploy --prod
```

## Notas
- No tiene backend: la "protección" de admin es por URL (obfuscación). Si querés usuarios/roles reales, podemos sumar Supabase/Firebase.
