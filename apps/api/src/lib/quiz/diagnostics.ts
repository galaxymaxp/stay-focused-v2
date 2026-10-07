import type { QuizGenerationDiagnostic } from './generation';

/** Log symbolic fields as JSON before console formatting can collapse nested pools. */
export function serializeQuizDiagnostic(jobId: string, diagnostic: QuizGenerationDiagnostic): string {
    const pool = diagnostic.pool;
    return JSON.stringify({ jobId, failureClass: diagnostic.failureClass, round: diagnostic.round,
        questionIds: diagnostic.questionIds, findings: diagnostic.findings,
        acceptedCount: diagnostic.acceptedCount, pendingCount: diagnostic.pendingCount, strategy: diagnostic.strategy,
        ...(pool ? { pool: { slotId: pool.slotId, candidateCount: pool.candidateCount, selectedIndex: pool.selectedIndex,
            authorCalls: pool.authorCalls, verifierCalls: pool.verifierCalls,
            blueprints: pool.blueprints.map(blueprint => ({ id: blueprint.id, affordance: blueprint.affordance, supportIds: blueprint.supportIds, intentKey: blueprint.intentKey })),
            results: pool.results.map(result => ({ index: result.index, findings: result.findings })) } } : {}) });
}
