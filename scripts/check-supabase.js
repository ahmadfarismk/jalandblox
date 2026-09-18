/**
 * F8 "done when" check: using the PUBLIC key (the one that ships in the app),
 * try to read and write every table and the postcard files. Every attempt
 * must be BLOCKED.
 *
 * Run: npm run check:supabase
 * Reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from .env.
 * Never put the secret key in .env: this script refuses to run with it.
 */
import { pathToFileURL } from 'node:url';

const TABLES = ['reviews', 'postcards', 'postcard_sends'];

/** Refuse the secret key: it bypasses every rule and must never be in .env or the app. */
export function looksSecret(key) {
  if (key.startsWith('sb_secret_')) return true;
  if (key.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
      return payload.role === 'service_role';
    } catch {
      return false;
    }
  }
  return false;
}

async function readBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Runs every check. Returns [{ label, ok, detail }].
 * @param {{ url: string, key: string, fetchFn?: typeof fetch }} options
 */
export async function runChecks({ url, key, fetchFn = fetch }) {
  const base = url.replace(/\/+$/, '');
  const headers = { apikey: key };
  // Old-style "anon" keys are JWTs and also go in the Authorization header.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;

  const results = [];
  const add = (label, ok, detail) => results.push({ label, ok, detail });

  // 1. Tables: reading must be refused with "permission denied" (42501).
  //    That answer also proves the table exists.
  for (const table of TABLES) {
    const label = `read table "${table}"`;
    try {
      const res = await fetchFn(`${base}/rest/v1/${table}?select=*&limit=1`, { headers });
      const body = await readBody(res);
      if (res.ok) add(label, false, `NOT blocked: the public key can read it (HTTP ${res.status})`);
      else if (body?.code === '42501') add(label, true, 'exists, and reading is blocked');
      else if (body?.code === 'PGRST205' || res.status === 404)
        add(label, false, 'table not found: run step 1 (initial_tables.sql)');
      else add(label, true, `blocked (HTTP ${res.status} ${body?.code ?? ''})`.trim());
    } catch (error) {
      add(label, false, `could not reach Supabase: ${error.message}. Check VITE_SUPABASE_URL.`);
      return results; // no point going on
    }
  }

  // 2. Writing a review directly must be refused (only the F9 function may write).
  {
    const res = await fetchFn(`${base}/rest/v1/reviews`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        place_id: 'abdul-samad',
        stars: 5,
        text: 'check-supabase test',
        email: 'test@example.com',
        lang: 'en',
        consent_at: new Date().toISOString(),
      }),
    });
    const body = await readBody(res);
    add(
      'write a review directly',
      !res.ok,
      res.ok
        ? 'NOT blocked: the public key can add reviews'
        : `blocked (HTTP ${res.status} ${body?.code ?? ''})`.trim(),
    );
  }

  // 3. Postcard files: listing must show nothing, uploading and public links must fail.
  {
    const res = await fetchFn(`${base}/storage/v1/object/list/postcards`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: '', limit: 10 }),
    });
    const body = await readBody(res);
    const seesFiles = res.ok && Array.isArray(body) && body.length > 0;
    add(
      'list postcard files',
      !seesFiles,
      seesFiles ? `NOT blocked: the public key can see ${body.length} file(s)` : 'no files visible',
    );
  }
  {
    const res = await fetchFn(`${base}/storage/v1/object/postcards/check-supabase-test.txt`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'text/plain' },
      body: 'test',
    });
    add(
      'upload a postcard file',
      !res.ok,
      res.ok
        ? 'NOT blocked: the public key uploaded check-supabase-test.txt (delete it in Storage)'
        : `blocked (HTTP ${res.status})`,
    );
  }
  {
    const res = await fetchFn(`${base}/storage/v1/object/public/postcards/any-file.pdf`, {
      headers,
    });
    add(
      'open a public postcard link',
      !res.ok,
      res.ok ? 'NOT blocked: the bucket is public' : `blocked (HTTP ${res.status})`,
    );
  }

  return results;
}

async function main() {
  try {
    process.loadEnvFile('.env');
  } catch {
    // No .env: fall back to variables already set in the shell.
  }
  const url = process.env.VITE_SUPABASE_URL?.trim();
  const key = process.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    console.error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env (see supabase/README.md).',
    );
    process.exit(1);
  }
  if (looksSecret(key)) {
    console.error(
      '❌ VITE_SUPABASE_ANON_KEY is the SECRET key. Remove it from .env now and use the public ' +
        '(publishable / anon) key. The secret key must never be in .env, the app or GitHub.',
    );
    process.exit(1);
  }

  console.log(`Checking ${url} with the public key…\n`);
  const results = await runChecks({ url, key });
  for (const r of results) console.log(`${r.ok ? '✅' : '❌'} ${r.label}: ${r.detail}`);

  const failed = results.filter((r) => !r.ok).length;
  console.log(
    failed
      ? `\n${failed} check(s) failed. See supabase/README.md.`
      : '\nAll blocked. F8 is done: the public key cannot read or write anything.',
  );
  process.exit(failed ? 1 : 0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
