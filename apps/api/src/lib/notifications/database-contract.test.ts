import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260726230833_hosted_processing_uploads_and_notifications.sql",
  ),
  "utf8",
);
const uploadAuthorizationMigration = readFileSync(
  resolve(
    process.cwd(),
    "../../packages/db/migrations/20260726232856_authorize_processing_resumable_uploads.sql",
  ),
  "utf8",
);

describe("hosted processing database contract", () => {
  it("keeps upload intents and notification tables service controlled", () => {
    expect(migration).toMatch(
      /alter table public\.processing_upload_intents enable row level security/i,
    );
    expect(migration).toMatch(
      /revoke all on table public\.processing_upload_intents from anon, authenticated/i,
    );
    expect(migration).toMatch(
      /revoke all on table public\.push_notification_devices from anon, authenticated/i,
    );
    expect(migration).toMatch(
      /revoke all on table public\.processing_notification_deliveries from anon, authenticated/i,
    );
  });

  it("claims notification deliveries atomically with a recoverable lease", () => {
    expect(migration).toMatch(/for update skip locked/i);
    expect(migration).toMatch(/status = 'sending'/i);
    expect(migration).toMatch(/lease_expires_at <= p_now/i);
    expect(migration).toMatch(/attempt_count = delivery\.attempt_count \+ 1/i);
  });

  it("prevents duplicate event delivery per device", () => {
    expect(migration).toMatch(
      /unique index processing_notification_event_device_unique/i,
    );
    expect(migration).toMatch(/unique \(expo_push_token\)/i);
    expect(migration).toMatch(/unique \(user_id, installation_id\)/i);
  });

  it("exposes privileged claim functions only to service_role", () => {
    expect(migration).toMatch(
      /revoke all on function public\.claim_processing_notification_deliveries[\s\S]*from public, anon, authenticated/i,
    );
    expect(migration).toMatch(
      /grant execute on function public\.claim_processing_notification_deliveries[\s\S]*to service_role/i,
    );
  });

  it("limits direct uploads to pending intents owned by the authenticated user", () => {
    expect(uploadAuthorizationMigration).toMatch(
      /file_size_limit = 10485760/i,
    );
    expect(uploadAuthorizationMigration).toMatch(
      /allowed_mime_types = array\['application\/pdf', 'image\/png', 'image\/jpeg'\]/i,
    );
    expect(uploadAuthorizationMigration).toMatch(/security definer/i);
    expect(uploadAuthorizationMigration).toMatch(/set search_path = ''/i);
    expect(uploadAuthorizationMigration).toMatch(
      /intent\.user_id = \(select auth\.uid\(\)\)/i,
    );
    expect(uploadAuthorizationMigration).toMatch(
      /intent\.status = 'pending'/i,
    );
    expect(uploadAuthorizationMigration).toMatch(
      /intent\.expires_at > now\(\)/i,
    );
    expect(uploadAuthorizationMigration).toMatch(
      /with check \([\s\S]*bucket_id = 'processing-job-sources'[\s\S]*processing_upload_is_authorized\(name\)/i,
    );
  });
});
