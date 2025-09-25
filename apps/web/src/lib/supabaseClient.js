// apps/web/src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Read Vite envs (must live in apps/web/.env or .env.local)
const rawUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

// Be defensive: trim, drop quotes, remove stray whitespace/newlines, and trailing slashes
const supabaseUrl = String(rawUrl).trim().replace(/\/+$/g, "");
const supabaseAnonKey = String(rawKey)
  .trim()
  .replace(/^['"]|['"]$/g, "") // strip wrapping quotes if any
  .replace(/\s+/g, ""); // remove any accidental spaces/newlines

// Helpful runtime guard & debug in dev
if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    "[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Add them to apps/web/.env and restart `pnpm dev`."
  );
}

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-console
  console.log("[Supabase env]", {
    url: supabaseUrl,
    keyPreview:
      supabaseAnonKey
        ? `${supabaseAnonKey.slice(0, 10)}…${supabaseAnonKey.slice(-6)}`
        : "(empty)",
    keyLen: supabaseAnonKey.length,
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);