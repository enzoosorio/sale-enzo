import { spawnSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const sourceRef = process.argv[2];
if (!sourceRef || !/^[a-z0-9]{20}$/.test(sourceRef)) throw Error('Pass the source project ref');

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(Boolean).map(line => { const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)]; }));
const sql = "select bucket_id || E'\\t' || name from storage.objects where is_delete_marker is not true order by bucket_id,name";
const query = spawnSync('docker', ['exec', 'supabase_db_sale-enzo-recovery', 'psql', '-U', 'postgres', '-d', 'postgres', '-Atc', sql], { encoding: 'utf8' });
if (query.status !== 0) throw Error(query.stderr);
const objects = query.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => { const at = line.indexOf('\t'); return { bucket: line.slice(0, at), name: line.slice(at + 1) }; });
const local = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
let copied = 0;
for (const object of objects) {
  const encoded = object.name.split('/').map(encodeURIComponent).join('/');
  const url = 'https://' + sourceRef + '.supabase.co/storage/v1/object/public/' + encodeURIComponent(object.bucket) + '/' + encoded;
  const response = await fetch(url);
  if (!response.ok) { console.error('remote download failed', object.bucket, object.name, response.status); continue; }
  const data = Buffer.from(await response.arrayBuffer());
  const output = join('recovery-reports', 'storage', object.bucket, object.name);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, data);
  const { error } = await local.storage.from(object.bucket).upload(object.name, data, { upsert: true, contentType: response.headers.get('content-type') || 'application/octet-stream' });
  if (error) { console.error('local upload failed', object.bucket, object.name, error.message); continue; }
  copied += 1;
}
console.log(JSON.stringify({ total: objects.length, copied }));
if (copied !== objects.length) process.exitCode = 1;
