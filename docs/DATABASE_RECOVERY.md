# Recuperación de Supabase: esquema y datos

Estado verificado el 24 de septiembre de 2026. El proyecto `sale_enzo's Project` (`hdbhvgxogazmawphpcnj`) está activo y accesible con Supabase CLI. Se consultó y exportó en modo solo lectura. **No ejecutar `db reset --linked` ni `db push` contra ese proyecto**: su esquema ya existe y su historial remoto de migraciones está vacío.

## Qué se conservó

La migración `20260923000000_legacy_public.sql` procede del `db dump --linked --schema public` real. Incluye las 21 tablas públicas originales, constraints, índices, grants, RLS y nueve funciones, entre ellas `is_admin()`, `get_products_for_grid_v2()` y `get_category_filters_payload()`. Se instala pgvector en `extensions`; `product_rag_profiles.embedding` y `user_rag_profiles.embedding` son `vector(1536)`. La migración `20260923000001_legacy_auth_storage.sql` conserva los dos triggers propios de `auth.users` y las tres políticas del bucket legado. Supabase administra el resto de `auth` y `storage`, que no debe recrearse dentro de una migración de aplicación.

Las migraciones posteriores son las dos de staging/publicación existentes y `20260924000003_harden_catalog_rls.sql`. Esta última corrige la autoasignación del rol `admin`, permite al visitante leer imágenes/categorías activas y oculta variantes y unidades de productos inactivos. Restringe la escritura del bucket legado al administrador.

Los CSV de `public/` son documentación parcial, no DDL. El historial de migraciones del remoto origen está vacío; las migraciones versionadas aquí son una **línea base reconstruida desde un volcado auténtico**, no un historial original recuperado.

## Arranque local sin datos privados

Desde un checkout con Docker operativo y dependencias instaladas:

```powershell
node node_modules/supabase/dist/supabase.js start
node node_modules/supabase/dist/supabase.js db reset --local
```

API: `http://127.0.0.1:55421`; PostgreSQL: puerto `55422`; Studio: `http://127.0.0.1:55423`. La semilla versionada está vacía a propósito: no publica usuarios ni productos del origen. Configurar `.env.local` con las claves de `supabase status` **local**, nunca las remotas. Este checkout aislado ya tiene ese archivo privado.

## Copia privada y restauración de datos

Los volcados están en `recovery-reports/`, ignorado por Git. Contienen usuarios, hashes de contraseña, tokens, productos y embeddings; protegerlos como una copia de base de datos. Para actualizar la copia desde el proyecto vinculado:

```powershell
node node_modules/supabase/dist/supabase.js db dump --linked --schema public -f recovery-reports/remote-schema.sql
node node_modules/supabase/dist/supabase.js db dump --linked --schema auth,storage -f recovery-reports/remote-managed-schema.sql
node node_modules/supabase/dist/supabase.js db dump --linked --data-only --schema auth,storage -f recovery-reports/remote-managed-data.sql
node node_modules/supabase/dist/supabase.js db dump --linked --data-only --schema public -f recovery-reports/remote-data.sql
```

Inspeccionar diferencias del esquema antes de actualizar la migración base. Para repetir la restauración local completa desde esos archivos:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/restore-supabase-snapshot.ps1
node scripts/copy-supabase-storage.mjs hdbhvgxogazmawphpcnj
```

El script reinicia **solo** el proyecto local `sale-enzo-recovery`, aplica migraciones, carga Auth/Storage y datos públicos en transacciones y quita la taxonomía de ejemplo que chocaría con el origen. La restauración reescribe las URLs del Storage antiguo al endpoint local (4 imágenes principales y 10 imágenes de variantes en esta copia). La copia binaria descarga los objetos de buckets públicos y los sube al Storage local; necesita acceso de red al proyecto origen y `.env.local` con la clave secreta **local**. Los archivos también quedan en `recovery-reports/storage/`, fuera de Git. Los buckets privados, si se añadieran, necesitarían exportación autenticada. No se migran sesiones activas utilizables entre proyectos: la configuración de Auth (OAuth, SMTP, URLs de redirección y secretos) se revisa por separado en el Dashboard.

## Verificación realizada

El reset limpio aplicó las cinco migraciones y restauró sin error 4 usuarios Auth y 4 perfiles públicos, 86 productos, 86 variantes, 86 unidades, 15 embeddings, 2 buckets y 16 archivos de Storage. Las referencias comprobadas entre usuarios, categorías, productos, variantes, unidades, perfiles e imágenes tienen cero huérfanos. El vector conserva dimensión 1536. Como `anon`, 86 productos activos son visibles, `is_admin()` es falso y ambas RPC del catálogo devuelven JSON. Una prueba transaccional confirmó que un producto inactivo y sus variantes/unidades/imágenes quedan ocultos; un usuario normal recibió un error de RLS al intentar cambiar su rol a `admin`.

## Antes de otro remoto

Crear un proyecto **vacío** para la migración futura; no usar el proyecto origen como destino de estas migraciones. Revisar el esquema, configuración Auth, políticas y objetos de Storage. Vincular el destino, ejecutar `db push --dry-run`, aplicar las migraciones y después restaurar datos/binaries con un procedimiento específico para ese destino. Probar una preview y las funciones de staging/R2 antes de cambiar el dominio. Guardar un respaldo nuevo. R2 para las imágenes de productos de staging depende del trabajo paralelo y de credenciales externas.
