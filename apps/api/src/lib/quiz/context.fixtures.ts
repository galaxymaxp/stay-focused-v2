import type { GenerationProvider, GenerationRequest } from '@stay-focused/engine';
import type { QuizPlan } from './generation';
import { acceptingProvider } from './fixtures';
import { regionsFromBlocks, type SourceBlock } from './sources';

/** Entirely invented lecture prose; reproduces coarse owners/short fragments,
 * not historical rejected questions or private course material. */
const concepts = [
    ['Identity checks', 'Authentication establishes the identity represented by supplied credentials.', 'If an identity check succeeds, authorization still determines permission for the requested course.', 'For example, a learner with valid credentials may still lack permission to open a particular course.'],
    ['Limited permissions', 'Least privilege grants only the permissions needed for assigned work.', 'If unrelated permissions are added, the assignment violates least privilege even when authentication succeeds.', 'For example, permission to read a shared report does not justify permission to delete it.'],
    ['Transformations', 'Encryption transforms readable information into ciphertext that a holder of the key can reverse.', 'In contrast, a one-way hash supports change detection rather than reversible recovery of the original information.', 'For example, storing a hash does not supply a reversible encrypted copy.'],
    ['Recovery copies', 'A backup provides a separate copy for restoring lost data.', 'If the copy has never been restored, its existence alone does not establish successful recovery.', 'For example, a restore test verifies that the stored copy can actually be recovered.'],
    ['Incident stages', 'Containment limits an active incident from spreading before eradication removes its cause.', 'After the cause has been removed, recovery returns the affected service to use.', 'For example, returning a still-compromised service to use before eradication skips the stated prerequisite.'],
    ['Accountable actions', 'An audit log records who performed an action, what occurred and when it occurred.', 'However, later review of that record does not itself prevent an unauthorized action.', 'For example, a recorded violation remains a violation even when the record is complete.'],
    ['Factor categories', 'Multi-factor authentication combines evidence from different categories, such as a password and a hardware token.', 'If two different passwords are supplied, both still belong to the knowledge category.', 'For example, changing the number of passwords does not create a possession factor.'],
    ['Deployment decisions', 'A patch should be tested against the service before deployment.', 'If the patch breaks the service, a prepared rollback restores its prior version.', 'For example, skipping the test does not improve patch reliability, whereas a rollback provides a recovery path.'],
] as const;
export function lectureBlocks(): SourceBlock[] {
    return [{ id: 'outline', kind: 'paragraph', text: 'Course overview: concepts and terms for discussion.'.padEnd(53, ' ') },
        ...concepts.flatMap(([title, ...sentences], index) => [
            { id: `heading-${index}`, kind: 'heading', text: title },
            ...sentences.map((text, member) => ({ id: `concept-${index}-block-${member}`, kind: 'paragraph', text, page: index * 3 + member + 1 })),
        ])];
}
export const lectureRegions = () => regionsFromBlocks('page:synthetic-lecture', 'Lecture', lectureBlocks());
export const coarseLectureRegions = () => regionsFromBlocks('page:synthetic-lecture', 'Lecture', lectureBlocks().filter(block => block.kind !== 'heading'));
export function groundedContractProvider(plan: QuizPlan): GenerationProvider {
    const base = acceptingProvider(plan);
    return { async generate<T>(input: GenerationRequest<T>): Promise<T> {
        const output = await base.generate<Record<string, unknown>>(input);
        if (input.schema.name === 'quiz_questions') for (const question of output.questions as Record<string, unknown>[]) {
            const region = [...plan.topics, ...(plan.reserveTopics ?? [])].find(topic => topic.id === question.topicId)!;
            if (region.evidence) question.sourceEvidence = region.evidence.slice(0, 5).map(span => ({ regionId: span.id, quote: region.text.slice(span.start, span.end) }));
        }
        return output as T;
    } };
}
