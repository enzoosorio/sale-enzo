# Sale Enzo

Tienda de segunda mano con Next.js, Supabase y panel de administración. La búsqueda semántica prevista usa embeddings en Supabase; el asistente conversacional se retiró. El flujo nuevo de captura, staging, imágenes R2 y publicación se desarrolla por separado.

## Arranque

Se necesita Node 24, Docker Desktop y una base Supabase con el esquema de la aplicación. Instalar dependencias con `npm ci`, iniciar Supabase con `npm run db:start`, copiar las claves locales que muestra `npm run db:status` a `.env.local` siguiendo `.env.example`, y ejecutar `npm run dev`. Las migraciones ya reconstruyen el esquema original, incluidas las RPC; la semilla no incluye productos privados. Para restaurar la copia del catálogo y las imágenes en local, sigue [Recuperación de la base](docs/DATABASE_RECOVERY.md).

Comprobaciones: `npm run typecheck`, `npm test`, `npm run lint` y `npm run build`. Lint conserva deuda anterior registrada en la recuperación; no desactives sus reglas para forzar un resultado verde.

## Arquitectura actual

Los productos, variantes, items, usuarios y embeddings residen en Supabase. Next.js usa el SDK de Supabase para datos y Server Actions para mutaciones. Las rutas API existentes atienden el flujo administrativo. Las imágenes nuevas de productos se preparan para R2; se mantiene Supabase Storage para imágenes de categorías. El catálogo es público y las operaciones administrativas requieren sesión más `is_admin()`. La búsqueda semántica no funciona todavía: la barra muestra un estado explícito y se conectará cuando la base y la RPC estén disponibles.

## Trabajo concurrente

El trabajo de staging/captura/R2 se encuentra en el checkout principal. Esta recuperación está en la rama aislada `codex/recovery-supabase-local`; antes de integrar, comparar cambios en `package.json`, `next.config.ts`, `src/proxy.ts` y migraciones.
