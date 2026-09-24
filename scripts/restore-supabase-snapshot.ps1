param(
  [string]$PublicDump = 'recovery-reports/remote-data.sql',
  [string]$ManagedDump = 'recovery-reports/remote-managed-data.sql',
  [string]$SourceRef = 'hdbhvgxogazmawphpcnj'
)

$ErrorActionPreference = 'Stop'
$projectId = 'sale-enzo-recovery'
$dbContainer = "supabase_db_$projectId"
$cli = Join-Path $PSScriptRoot '../node_modules/supabase/dist/supabase.js'
$publicPath = (Resolve-Path -LiteralPath $PublicDump).Path
$managedPath = (Resolve-Path -LiteralPath $ManagedDump).Path

# Explicit --local prevents the linked remote project from being reset.
& node $cli db reset --local
if ($LASTEXITCODE -ne 0) { throw 'Local Supabase reset failed' }

& docker cp $managedPath "${dbContainer}:/tmp/remote-managed-data.sql"
if ($LASTEXITCODE -ne 0) { throw 'Could not copy Auth/Storage data' }
& docker cp $publicPath "${dbContainer}:/tmp/remote-data.sql"
if ($LASTEXITCODE -ne 0) { throw 'Could not copy public data' }

# The source dump has cyclic category FKs. Disable triggers only inside each local
# restore transaction, then verify references separately.
& docker exec $dbContainer psql -U postgres -d postgres -X -1 -v ON_ERROR_STOP=1 -c 'SET session_replication_role = replica' -f /tmp/remote-managed-data.sql
if ($LASTEXITCODE -ne 0) { throw 'Auth/Storage data restore failed' }

# The staging migration inserts a demo taxonomy that overlaps with source rows.
# The freshly reset local database has no product data yet.
& docker exec $dbContainer psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -c 'TRUNCATE public.product_categories CASCADE'
if ($LASTEXITCODE -ne 0) { throw 'Could not clear local demo taxonomy' }

& docker exec $dbContainer psql -U postgres -d postgres -X -1 -v ON_ERROR_STOP=1 -c 'SET session_replication_role = replica' -f /tmp/remote-data.sql
if ($LASTEXITCODE -ne 0) { throw 'Public data restore failed' }

if ($SourceRef -notmatch '^[a-z0-9]{20}$') { throw 'Invalid source project ref' }
$oldHost = "https://$SourceRef.supabase.co"
$newHost = 'http://127.0.0.1:55421'
$rewriteSql = "UPDATE public.product_variants SET main_img_url = replace(main_img_url, '$oldHost', '$newHost') WHERE main_img_url LIKE '$oldHost%'; UPDATE public.variant_images SET image_url = replace(image_url, '$oldHost', '$newHost') WHERE image_url LIKE '$oldHost%'; UPDATE public.category_images SET img_url = replace(img_url, '$oldHost', '$newHost') WHERE img_url LIKE '$oldHost%';"
& docker exec $dbContainer psql -U postgres -d postgres -X -v ON_ERROR_STOP=1 -c $rewriteSql
if ($LASTEXITCODE -ne 0) { throw 'Could not rewrite legacy Storage URLs for local use' }

Write-Host 'Local SQL snapshot restored. Copy Storage binaries separately, then run integrity checks.'
