/**
 * ⚠️ IMPORTANTE: No crear instancias globales de Supabase
 * 
 * Con Next.js 15+, cookies() solo funciona dentro del contexto de una request.
 * 
 * ❌ MAL - No hacer esto:
 * export const supabase = await createClient();
 * 
 * ✅ BIEN - Crear cliente dentro de cada función:
 * 
 * Server Components / Server Actions:
 * -----------------------------------
 * import { createClient } from '@/utils/supabase/server';
 * 
 * export async function myServerFunction() {
 *   const supabase = await createClient();
 *   const { data } = await supabase.from('table').select();
 * }
 * 
 * Client Components:
 * ------------------
 * import { createClient } from '@/utils/supabase/client';
 * 
 * export function MyComponent() {
 *   const supabase = createClient();
 *   // ...
 * }
 * 
 * Referencias:
 * - https://supabase.com/docs/guides/auth/server-side/nextjs
 * - https://nextjs.org/docs/messages/next-dynamic-api-wrong-context
 */

// Este archivo solo documenta el patrón correcto
// No exporta ninguna instancia para evitar errores
export {};