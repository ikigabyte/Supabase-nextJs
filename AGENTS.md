# Repository instructions

These instructions apply throughout this repository. Read [AGENT.md](AGENT.md) for the existing project scope.

## Required version bump for published updates

- Every successfully published production application update must increment the version in `public.orders.name_id` for the single row where `order_id = 0` by exactly `0.01`.
- A user request to publish an application update includes authorization for this version bump. Follow any explicit instruction to skip or delay it.
- Complete the release's checks and verify the production deployment succeeded before bumping the version, so users are prompted to refresh only when the new application is available.
- Bump once per release. Do not bump for each local change, build, deployment retry, or documentation-only save. A separate explicit request to bump the version can be executed without a new deployment.
- Use the executable Node command below for the version bump. The proposed `npm run version:bump` wrapper is not implemented.

## Safe execution and completion

1. Fetch the single live order-0 row; stop if it is missing or more than one row matches. Never assume the last documented version is still current.
2. Validate its decimal version label, calculate the next value using integer hundredths, and preserve its prefix/format. Examples: `V.75` → `V.76`; `V.99` → `V1.00`.
3. Update only `name_id`, guarded by both `order_id = 0` and the previously fetched `name_id`. Do not change release notes or other fields unless separately requested.
4. Verify exactly one updated row, independently read the row back, and confirm the expected version and unchanged remaining fields.
5. Report the old/new versions only after verification. If a write's outcome is uncertain, read back before retrying; do not increment twice for the same release.
6. Record the verified bump and associated application commit in the verified release history below. Saving that record does not require another bump.

Use the project's existing server-side Supabase configuration. Never print credentials, put secrets in documentation, or expose the service-role key to browser code.

If a deployment succeeds but the version bump fails, report those outcomes separately and finish the missing bump without redeploying or repeating an already successful increment.

Keep this file current whenever the release procedure changes. Keep [docs/REALTIME.md](docs/REALTIME.md) current when changing realtime behavior.

## Executable command

Run from the repository root with dependencies installed and the existing `.env.local` server configuration available. The command defaults to a preview and never prints credentials.

For a preview, keep `--dry-run`. To perform the authorized bump, replace it with `--apply` before running the same block.

```bash
node - --dry-run <<'JS'
const { loadEnvConfig } = require('@next/env');
const { createClient } = require('@supabase/supabase-js');
loadEnvConfig(process.cwd());

(async () => {
  const apply = process.argv.includes('--apply');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Required Supabase configuration is missing.');

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: before, error: readError } = await client.from('orders')
    .select('*').eq('order_id', 0).single();
  if (readError) throw new Error(`Version lookup failed: ${readError.message}`);

  const match = /^([Vv])(\d*)\.(\d{2})$/.exec(before.name_id);
  if (!match) throw new Error('Unsupported version format; no update attempted.');
  const hundredths = BigInt(match[2] || '0') * 100n + BigInt(match[3]) + 1n;
  const major = hundredths / 100n;
  const next = match[1] + (major === 0n && match[2] === '' ? '' : major.toString())
    + '.' + (hundredths % 100n).toString().padStart(2, '0');

  if (!apply) {
    console.log(JSON.stringify({ old: before.name_id, next, dry_run: true }));
    return;
  }

  const { data: updated, error: updateError } = await client.from('orders')
    .update({ name_id: next }).eq('order_id', 0).eq('name_id', before.name_id)
    .select('order_id, name_id').single();
  if (updateError) throw new Error(`Write not confirmed: ${updateError.message}. Read back before retrying.`);
  if (updated.name_id !== next) throw new Error('Unexpected write response; read back before retrying.');

  const { data: after, error: verifyError } = await client.from('orders')
    .select('*').eq('order_id', 0).single();
  if (verifyError || after.name_id !== next) {
    throw new Error('Write succeeded, but read-back verification failed. Do not repeat the increment.');
  }
  const changed = Object.keys(before).filter((field) => field !== 'name_id'
    && JSON.stringify(before[field]) !== JSON.stringify(after[field]));
  if (changed.length) throw new Error(`Version changed, but other fields also changed: ${changed.join(', ')}. Do not repeat the increment.`);

  console.log(JSON.stringify({ order_id: 0, old: before.name_id, version: after.name_id, verified: true }));
})().catch((error) => { console.error(error.message); process.exitCode = 1; });
JS
```

If a write times out or verification fails, independently read the live order-0 version before any retry. An error after sending the write does not prove the update failed. Compare the saved version with the previous attempt's intended value and finish verification instead of incrementing again if it already succeeded.

The convenience wrappers `npm run version:bump` and `npm run version:bump -- --dry-run` remain proposals; they are not currently defined in `package.json`.

## Existing update notification behavior

`components/header.tsx` reads `name_id` and `notes` from the order-0 row on page load/navigation. It compares that version with the logged-in user's `profiles.latest_version_review` to decide whether to show “New update available.”

A version bump does not immediately notify someone staying on the same page. Immediate detection would require a separate change to the notification flow.

## Verified release history

| Date | Application commit | Version bump | Verification |
| --- | --- | --- | --- |
| 2026-10-14 | `1593973` | `V.75` → `V.76` | Independently read back; all other fields unchanged. |

Always fetch the live version before the next bump. The table records completed changes, not a guaranteed current database value.

Saving these instructions does not change the database version or trigger a release.
