import { describe, expect, it } from 'vitest';
import { looksSecret, runChecks } from './check-supabase.js';

const URL = 'https://example.supabase.co';

/** A pretend Supabase that answers each request with the given responses. */
function fakeSupabase(answer) {
  return async (url, options = {}) => {
    const [status, body] = answer(url, options.method ?? 'GET');
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
}

const LOCKED = fakeSupabase((url, method) => {
  if (url.includes('/rest/v1/') && method === 'GET')
    return [401, { code: '42501', message: 'permission denied for table' }];
  if (url.includes('/rest/v1/')) return [401, { code: '42501' }];
  if (url.includes('/object/list/')) return [200, []];
  return [400, { error: 'not allowed' }];
});

describe('check-supabase', () => {
  it('passes every check on a locked-down project', async () => {
    const results = await runChecks({ url: URL, key: 'sb_publishable_x', fetchFn: LOCKED });
    expect(results).toHaveLength(7); // 3 tables, 1 write, 3 file checks
    expect(results.every((r) => r.ok)).toBe(true);
  });

  it('fails when a table can be read with the public key', async () => {
    const open = fakeSupabase((url, method) =>
      url.includes('/rest/v1/reviews') && method === 'GET' ? [200, []] : [401, { code: '42501' }],
    );
    const results = await runChecks({ url: URL, key: 'sb_publishable_x', fetchFn: open });
    expect(results.find((r) => r.label.includes('"reviews"')).ok).toBe(false);
  });

  it('says so when the tables were not created yet', async () => {
    const empty = fakeSupabase(() => [404, { code: 'PGRST205' }]);
    const results = await runChecks({ url: URL, key: 'sb_publishable_x', fetchFn: empty });
    expect(results[0]).toMatchObject({ ok: false, detail: expect.stringContaining('run step 1') });
  });

  it('fails when files can be uploaded or the bucket is public', async () => {
    const leaky = fakeSupabase((url) => {
      if (url.includes('/rest/v1/')) return [401, { code: '42501' }];
      if (url.includes('/object/list/')) return [200, [{ name: 'petronas.pdf' }]];
      return [200, 'ok'];
    });
    const results = await runChecks({ url: URL, key: 'sb_publishable_x', fetchFn: leaky });
    expect(results.filter((r) => !r.ok).map((r) => r.label)).toEqual([
      'list postcard files',
      'upload a postcard file',
      'open a public postcard link',
    ]);
  });

  it('stops early when Supabase cannot be reached', async () => {
    const offline = async () => {
      throw new Error('getaddrinfo ENOTFOUND');
    };
    const results = await runChecks({ url: URL, key: 'sb_publishable_x', fetchFn: offline });
    expect(results).toHaveLength(1);
    expect(results[0].ok).toBe(false);
  });

  it('recognises the secret key so it is never used here', () => {
    const jwt = (role) =>
      `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.sig`;
    expect(looksSecret('sb_secret_abc')).toBe(true);
    expect(looksSecret(jwt('service_role'))).toBe(true);
    expect(looksSecret(jwt('anon'))).toBe(false);
    expect(looksSecret('sb_publishable_abc')).toBe(false);
  });
});
