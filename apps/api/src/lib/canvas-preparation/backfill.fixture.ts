import type { PGlite } from '@electric-sql/pglite';
import type { PreparationClient } from './repository';

type Row = Record<string, unknown>;
const identifier = (name: string) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(name)) throw new Error('invalid_fixture_identifier');
  return `"${name}"`;
};
const serializable = (row: Row): Row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]));

/** Local REST-shaped adapter: real migration tables/RPCs, synthetic inventory
 * defaults, and deterministic query filtering. Never constructs a network client. */
export async function preparationBackfillClient(db: PGlite, connectionId: string) {
  const tables = new Set((await db.query<{ tablename: string }>("select tablename from pg_tables where schemaname='public'")).rows.map(row => row.tablename));
  const faults = { readTable: '', rpcOnce: '' };
  const calls: { name: string; args: Row }[] = [];
  const client = {
    rpc: async (name: string, args: Row) => {
      calls.push({ name, args });
      if (faults.rpcOnce === name) { faults.rpcOnce = ''; return { data: null, error: { code: 'fixture_crash' } }; }
      try {
        const keys = Object.keys(args);
        const parameters = keys.map((key, index) => `${identifier(key)}=>$${index + 1}`).join(',');
        const result = await db.query<Row>(`select * from ${identifier(name)}(${parameters})`, keys.map(key => {
          const value = args[key];
          return value && typeof value === 'object' && key !== 'p_job_ids' ? JSON.stringify(value) : value;
        }));
        const scalar = ['register_canvas_preparation_sync_v1', 'drain_canvas_preparation_sync_v1', 'canvas_preparation_evidence_current_v1'].includes(name);
        return { data: scalar ? result.rows[0]?.[name] : result.rows.map(serializable), error: null };
      } catch (error) { return { data: null, error }; }
    },
    from: (table: string) => {
      const filters: ((row: Row) => boolean)[] = [];
      const orders: { column: string; ascending: boolean }[] = [];
      let start = 0; let end = Infinity; let mutation: 'update' | 'delete' | 'upsert' | null = null;
      let values: Row[] = []; let count = false;
      const defaults = (row: Row): Row => ({
        canvas_connection_id: connectionId, canvas_course_id: '101', id: row.course_id,
        name: 'Synthetic Biology', workflow_state: 'available', base_url: 'https://canvas.example.invalid',
        display_name: 'Instructional notes.txt', filename: 'notes.txt', content_type: 'text/plain',
        ingestion_eligibility: 'eligible_document', size_bytes: 10, stored_byte_count: 10,
        stored_content_type: 'text/plain', storage_bucket: 'canvas-source-files',
        storage_object_key: 'local-fixture-only', hidden: false, hidden_for_user: false, locked: false,
        last_synced_at: '2026-10-14T00:00:00Z', first_synced_at: '2026-10-14T00:00:00Z',
        ...serializable(row),
      });
      const run = async () => {
        if (faults.readTable === table) return { data: null, error: { code: 'fixture_incomplete' }, count: null };
        try {
          const all = tables.has(table) ? (await db.query<Row>(`select * from ${identifier(table)}`)).rows.map(defaults) : [];
          const selected = all.filter(row => filters.every(test => test(row)));
          selected.sort((a, b) => {
            for (const order of orders) {
              const comparison = String(a[order.column] ?? '').localeCompare(String(b[order.column] ?? ''));
              if (comparison) return order.ascending ? comparison : -comparison;
            }
            return 0;
          });
          if (mutation === 'upsert') {
            const inserted: Row[] = [];
            for (const row of values) {
              const keys = Object.keys(row);
              const result = await db.query<Row>(`insert into ${identifier(table)}(${keys.map(identifier).join(',')}) values(${keys.map((_, index) => `$${index + 1}`).join(',')}) on conflict do nothing returning *`, keys.map(key => row[key]));
              inserted.push(...result.rows.map(serializable));
            }
            return { data: inserted, error: null, count: null };
          } else if (mutation) {
            for (const row of selected) {
              const keys = table === 'canvas_preparation_discoveries' ? ['user_id', 'course_id', 'material_id'] : ['course_id'];
              const patch = mutation === 'update' ? Object.keys(values[0]!) : [];
              const where = keys.map((key, index) => `${identifier(key)}=$${patch.length + index + 1}`).join(' and ');
              const sql = mutation === 'delete' ? `delete from ${identifier(table)} where ${where}`
                : `update ${identifier(table)} set ${patch.map((key, index) => `${identifier(key)}=$${index + 1}`).join(',')} where ${where}`;
              // Sync ledgers use their ID; cursors use course_id.
              const finalSql = table === 'canvas_preparation_syncs' ? sql.replace('"course_id"', '"id"') : sql;
              await db.query(finalSql, [...patch.map(key => values[0]![key]), ...keys.map(key => table === 'canvas_preparation_syncs' ? row.id : row[key])]);
            }
          }
          return { data: selected.slice(start, end + 1), error: null, count: count ? selected.length : null };
        } catch (error) { return { data: null, error, count: null }; }
      };
      const query = {
        select: (_columns?: string, options?: { count?: string; head?: boolean }) => { count = options?.count === 'exact'; return query; },
        eq: (key: string, value: unknown) => { filters.push(row => row[key] === value); return query; },
        neq: (key: string, value: unknown) => { filters.push(row => row[key] !== value); return query; },
        in: (key: string, entries: unknown[]) => { filters.push(row => entries.includes(row[key])); return query; },
        lte: (key: string, value: string) => { filters.push(row => Date.parse(String(row[key])) <= Date.parse(value)); return query; },
        like: (key: string, pattern: string) => { filters.push(row => String(row[key]).startsWith(pattern.replace(/%$/, ''))); return query; },
        not: (key: string, operator: string, value: unknown) => { filters.push(row => operator === 'like'
          ? !String(row[key]).startsWith(String(value).replace(/%$/, '')) : row[key] !== value); return query; },
        order: (column: string, options?: { ascending?: boolean }) => { orders.push({ column, ascending: options?.ascending !== false }); return query; },
        range: (from: number, to: number) => { start = from; end = to; return query; },
        limit: (limit: number) => { end = limit - 1; return query; },
        upsert: (rows: Row[]) => { mutation = 'upsert'; values = rows; return query; },
        update: (row: Row) => { mutation = 'update'; values = [row]; return query; },
        delete: () => { mutation = 'delete'; return query; },
        maybeSingle: async () => { const result = await run(); return { ...result, data: result.data?.[0] ?? null }; },
        then: <T>(resolve: (value: Awaited<ReturnType<typeof run>>) => T) => run().then(resolve),
      };
      return query;
    },
  };
  return { client: client as unknown as PreparationClient, faults, calls };
}
