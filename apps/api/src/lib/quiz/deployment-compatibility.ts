import { createHash } from 'node:crypto';

const signatures = {
    create_quiz_processing_job: 'p_user_id uuid, p_course_id uuid, p_reviewer_id uuid, p_idempotency_key text, p_input jsonb',
    complete_quiz_processing_job: 'p_job_id uuid, p_worker_id text, p_result_type text, p_payload jsonb, p_metrics jsonb',
    start_quiz_attempt: 'p_user_id uuid, p_quiz_id uuid, p_request_key text',
    save_quiz_answer: 'p_user_id uuid, p_attempt_id uuid, p_question_id text, p_selected jsonb, p_finalize boolean',
    complete_quiz_attempt: 'p_user_id uuid, p_attempt_id uuid, p_abandon boolean',
} as const;
type Rpc = keyof typeof signatures;
export type QuizRpcFingerprints = Readonly<Record<Rpc, string>>;
const tables = ['quizzes', 'quiz_keys', 'quiz_attempts'] as const;

/** Catalog metadata and aggregate saved-format counts only. Never returns
 * private keys, answers, source text or individual learner rows.
 * Run against the intended target through an authorized read-only SQL channel.
 */
export const quizDeploymentInspectionSql = `select jsonb_build_object(
 'version',1,
 'functions',(select coalesce(jsonb_agg(jsonb_build_object(
   'name',p.proname,'arguments',pg_get_function_identity_arguments(p.oid),
   'body_md5',md5(btrim(replace(p.prosrc,E'\\r\\n',E'\\n'),E' \\n\\r\\t')),
   'security_definer',p.prosecdef,'configuration',p.proconfig,
   'anon_execute',has_function_privilege('anon',p.oid,'EXECUTE'),
   'authenticated_execute',has_function_privilege('authenticated',p.oid,'EXECUTE'),
   'service_execute',has_function_privilege('service_role',p.oid,'EXECUTE')
 ) order by p.proname),'[]'::jsonb)
 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname in (${Object.keys(signatures).map(name => `'${name}'`).join(',')})),
 'tables',(select coalesce(jsonb_agg(jsonb_build_object(
   'name',c.relname,'rls',c.relrowsecurity,
   'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
   'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT')
 ) order by c.relname),'[]'::jsonb)
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and c.relname in ('quizzes','quiz_keys','quiz_attempts')),
 'saved_formats',jsonb_build_object(
   'legacy_matching_questions',(select count(*) from public.quiz_keys k,jsonb_array_elements(k.questions) q
     where q->>'type'='matching' and (jsonb_typeof(q->'leftItems') is distinct from 'array'
       or jsonb_typeof(q->'rightItems') is distinct from 'array' or jsonb_typeof(q->'correctPairs') is distinct from 'array')),
   'unsupported_question_types',(select count(*) from public.quiz_keys k,jsonb_array_elements(k.questions) q
     where q->>'type' is null or q->>'type' not in ('single_select','multi_select','true_false','matching')),
   'assisted_attempts',(select count(*) from public.quiz_attempts a
     where case when jsonb_typeof(to_jsonb(a)->'study_state'->'assisted')='array'
       then jsonb_array_length(to_jsonb(a)->'study_state'->'assisted')>0 else false end)
 )
) as inspection;`;

/** MD5 is an equality fingerprint, not a security signature. Normalize only
 * line endings and outer whitespace, preserving literals and all SQL behavior.
 * Any unreviewed body difference blocks rather than inferring compatibility
 * from the presence of a few field names. Never execute the input migrations.
 */
export function checkpointQuizRpcFingerprints(migrations: readonly string[]): QuizRpcFingerprints {
    const bodies = new Map<string, string>();
    for (const sql of migrations) {
        const pattern = /create\s+(?:or\s+replace\s+)?function\s+public\.(\w+)\s*\([^]*?\bas\s+\$\$([^]*?)\$\$/gi;
        for (const match of sql.matchAll(pattern)) {
            if (Object.hasOwn(signatures, match[1]!))
                bodies.set(match[1]!, createHash('md5').update(match[2]!.replace(/\r\n/g, '\n').trim()).digest('hex'));
        }
    }
    const entries = Object.keys(signatures).map(name => {
        const fingerprint = bodies.get(name);
        if (!fingerprint) throw new Error('quiz_checkpoint_rpc_missing');
        return [name, fingerprint];
    });
    return Object.fromEntries(entries) as unknown as QuizRpcFingerprints;
}

function record(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** A MATCH certifies only the inspected RPC bodies, access settings and absence
 * of the counted unsupported saved behaviors. It is
 * not deployment authorization or proof of data, client, source or device
 * acceptance. Capture metadata again immediately before an approved rollout.
 */
export function assessQuizDeployment(value: unknown, expected: QuizRpcFingerprints) {
    const input = record(value);
    const issues: { surface: string; code: string }[] = [];
    if (input.version !== 1 || !Array.isArray(input.functions) || !Array.isArray(input.tables))
        return { verdict: 'BLOCKED' as const, issues: [{ surface: 'inspection', code: 'metadata_missing_or_invalid' }] };
    for (const name of Object.keys(signatures) as Rpc[]) {
        const rows = input.functions.map(record).filter(row => row.name === name);
        if (rows.length !== 1) {
            issues.push({ surface: name, code: 'rpc_missing_or_overloaded' });
            continue;
        }
        const row = rows[0]!;
        if (row.arguments !== signatures[name]) issues.push({ surface: name, code: 'named_arguments_differ' });
        if (row.body_md5 !== expected[name]) issues.push({ surface: name, code: 'rpc_body_requires_review' });
        if (row.security_definer !== true || !Array.isArray(row.configuration)
            || !row.configuration.includes('search_path=""') || row.anon_execute !== false
            || row.authenticated_execute !== false || row.service_execute !== true)
            issues.push({ surface: name, code: 'rpc_access_requires_review' });
    }
    for (const name of tables) {
        const rows = input.tables.map(record).filter(row => row.name === name);
        if (rows.length !== 1) {
            issues.push({ surface: name, code: 'table_metadata_missing_or_duplicate' });
            continue;
        }
        const row = rows[0]!;
        if (row.rls !== true || row.anon_select !== false || row.authenticated_select !== (name !== 'quiz_keys'))
            issues.push({ surface: name, code: 'table_access_requires_review' });
    }
    const formats = record(input.saved_formats);
    for (const name of ['legacy_matching_questions', 'unsupported_question_types', 'assisted_attempts']) {
        const count = formats[name];
        if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0)
            issues.push({ surface: name, code: 'saved_format_inventory_missing_or_invalid' });
        else if (count > 0) issues.push({ surface: name, code: 'saved_behavior_requires_preservation_boundary' });
    }
    return { verdict: issues.length ? 'BLOCKED' as const : 'MATCH' as const, issues };
}
