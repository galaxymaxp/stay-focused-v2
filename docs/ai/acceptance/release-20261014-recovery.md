# RB2 recovery procedure

The release uses additive tables/columns and reviewed RPC replacements. Existing
clients remain supported. Do not reverse migrations by dropping student data.

Before production DDL, a private application export was completed at
2026-10-14T15:51:49Z: 69 public tables, 20,898 rows. Every JSON file was parsed;
SHA-256 hashes were recorded locally. Existing public function definitions,
policies and grants were also exported. These files contain private data and
remain in the ignored `.local/recovery-20261014` directory of the release
checkout. This is an application-level recovery export, not a PITR snapshot;
Auth users and Storage bytes are not restored by it. The migrations do not
modify existing Auth users or Storage objects. No restore has been claimed.

If rollout fails, stop new preparation dispatch and the Scheduler, return the
API to Vercel deployment `dpl_D7XoTybcNT1ib9AMcEvXYU8tKB4P`, and return the
worker to revision `generation-worker-00024-p6n`. Leave additive tables and
columns in place. If an RPC replacement is incompatible, apply a new forward
compensating migration using its pre-release function definition and ACL from
the private export, after inspecting live dependencies and writes. Preserve
newly created rows. Do not bulk-import the export over newer student records.

Individual connector migrations are transactional; on error inspect the ledger
and schema before retrying. After every successful migration check its ledger
entry, public-table RLS, privileged-function grants and private bucket settings.
The isolated PGlite migration/RLS tests passed in the API suite; hosted Supabase
branch creation remains unavailable on this project's plan.

VL3's earlier guard incident concerned synthetic temporary directories. The
owner approved it on 2026-10-15. Fresh API tests used TEMP/TMP inside this checkout
and passed: 2,085 tests, three existing opt-in skips.
