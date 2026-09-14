import { describe, expect, it } from 'vitest';
import type { GenerationRequest } from '@stay-focused/engine';
import { createServerOpenAIProvider } from '@/providers';
import { generateQuiz, makeQuizPlan, QUIZ_MODEL, type QuizGenerationDiagnostic, type QuizRegion } from './generation';
import { request } from './fixtures';
import { writeFileSync } from 'node:fs';

const checks = ['keyCorrect', 'distractorsWrong', 'unambiguous', 'explanationGrounded', 'sourceSufficient', 'noExternalFacts', 'plausibleOptions', 'distinctConcept', 'noLeakage', 'learnerSelfContained', 'arithmeticCorrect', 'academicValue'] as const;
const asRecord = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

describe('B25.3.2 bounded live Quiz validation', () => {
    it.skipIf(process.env.B25_3_2_LIVE !== '1')('generates five grounded questions from a lecture-shaped synthetic prepared source', async () => {
        if (process.env.B25_3_2_ENV_FILE)
            process.loadEnvFile(process.env.B25_3_2_ENV_FILE);
        const facts = [
            'Authentication checks a learner identity using credentials, whereas authorization separately checks whether that authenticated learner may open a particular course; a successful login alone does not grant course access.',
            'Least privilege grants a learner only the permissions needed for assigned work; adding unrelated permissions violates least privilege even when the learner uses a strong password.',
            'Encryption transforms readable information into ciphertext that an authorized holder of the key can reverse, whereas a one-way hash is not reversible encryption and is used to check whether data has changed.',
            'A backup is a separate copy used to restore lost data, but a restore test verifies that the copy can actually be recovered; merely creating a backup does not prove recovery will work.',
            'Containment limits an active incident from spreading, eradication removes the cause after containment, and recovery returns the affected service to use after the cause has been removed.',
            'An audit log records who performed an action, what action occurred, and when it occurred; the log supports later review but does not itself prevent an unauthorized action.',
            'Multi-factor authentication combines evidence from different factor categories, such as a password and a hardware token; two different passwords are still one factor category.',
            'A patch should be tested against the service before deployment; if the patch breaks the service, a prepared rollback restores the prior version, while skipping testing does not improve patch reliability.',
        ];
        const region: QuizRegion = { id: 'synthetic-source', label: 'Synthetic security operations', text: facts.join('\n'), sourceRefs: [{ materialId: 'synthetic-material', regionId: 'synthetic-source', page: 1, slide: null }], reviewerSectionIds: [] };
        const plan = makeQuizPlan([region], { ...request, difficulty: 'mixed', questionTypes: ['single_select', 'true_false'] });
        expect(new Set(plan.allocation.map(slot => slot.topicId)).size).toBe(5);
        const provider = createServerOpenAIProvider();
        const diagnostics: QuizGenerationDiagnostic[] = [];
        const verdicts: unknown[] = [];
        let authorCalls = 0;
        let verifierCalls = 0;
        let acceptedCount = 0;
        const started = Date.now();
        try {
            const questions = await generateQuiz({ async generate<T>(input: GenerationRequest<T>): Promise<T> {
                if (input.schema.name === 'quiz_verification') {
                    verifierCalls++;
                }
                else
                    authorCalls++;
                const output = await provider.generate(input);
                if (input.schema.name === 'quiz_verification') {
                    const rows = asRecord(output).verdicts;
                    verdicts.push(Array.isArray(rows) ? rows.map(value => {
                        const row = asRecord(value);
                        return { id: row.id, assessedDifficulty: row.assessedDifficulty, checks: Object.fromEntries(checks.map(check => [check, row[check]])), optionCount: Array.isArray(row.optionAnalysis) ? row.optionAnalysis.length : null, defensibleCount: Array.isArray(row.defensibleOptionIds) ? row.defensibleOptionIds.length : null };
                    }) : { malformed: true });
                }
                return output;
            } }, plan, undefined, [], diagnostic => diagnostics.push(diagnostic));
            expect(questions).toHaveLength(5);
            expect(new Set(questions.map(question => question.topicId)).size).toBe(5);
            acceptedCount = questions.length;
        }
        finally {
            const summary = { model: QUIZ_MODEL, authorCalls, verifierCalls, acceptedCount, durationMs: Date.now() - started, verdicts, diagnostics };
            console.info('b25_3_2_live_quiz_verdict', JSON.stringify(summary));
            if (process.env.B25_3_2_REPORT_FILE) writeFileSync(process.env.B25_3_2_REPORT_FILE, JSON.stringify(summary, null, 2));
        }
    }, 300000);
});
