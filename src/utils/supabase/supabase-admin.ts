import { createClient } from "@supabase/supabase-js";

const supabaseAdminUrl = process.env.SUPABASE_URL!;
const supabaseAdminKey = process.env.SUPABASE_SECRET_KEY!;

export const supabaseAdmin = createClient(
  supabaseAdminUrl,
  supabaseAdminKey
);