import { describe, it, expect, vi } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import type { ActivitySource } from '@stay-focused/shared';
import type { GenerationProvider } from '@stay-focused/engine';
import { extractOfficeText } from './office-extraction';
import { createTaskSpecification, expectedParts, generateActivity, MISSING_INFORMATION, sourceRole, validateGeneratedContent } from './generation';
import { assignmentLinks } from './sources';
import { readGenerationInput, validateEditableContent } from './service';
const source = (text: string, role: ActivitySource['role'] = 'instructions', id = 'instructions'): ActivitySource => ({ id, title: role === 'instructions' ? 'Activity' : 'Template', role, text, materialId: null });
const zip = (parts: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, strToU8(v)])));
const docx = (body: string, extra: Record<string, string> = {}) => zip({ 'word/document.xml': `<w:document xmlns:w="urn:word"><w:body>${body}</w:body></w:document>`, ...extra });
const p = (s: string, heading = false) => `<w:p>${heading ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' : ''}<w:r><w:t>${s}</w:t></w:r></w:p>`;
export const fixtures = [
    ['Research', 'Research the supplied evidence. Required sections: Findings, Limitations', 'research'],
    ['Reflection', 'Write one paragraph reflecting on the supplied reading.', 'reflection'],
    ['Q&A', 'Answer questions 1–5.', 'question_answer'],
    ['Lab report', 'Complete the lab report using this template.', 'lab_report'],
    ['Presentation', 'Create 10 slides.', 'presentation'],
    ['PDF instructions', 'Provide three reasons.', 'question_answer'],
    ['Scanned PDF instructions', 'Write a reflection.', 'reflection'],
    ['Image instructions', 'Answer questions 1–3.', 'question_answer'],
    ['Sparse instructions', 'Use the attached activity sheet.', 'custom'],
    ['Custom teacher template', 'Use this template.', 'custom'],
    ['Technical programming', 'Write a program implementing the supplied algorithm.', 'programming'],
    ['Exactly N answers', 'Provide exactly 3 answers.', 'question_answer'],
    ['No conclusion', 'Write an essay. No conclusion required.', 'essay'],
    ['Missing source information', 'Calculate the missing observation value.', 'calculation'],
] as const;
describe('B24.6 instruction contracts', () => {
    it.each(fixtures)('%s preserves instructions and detects a flexible type', (_name, instructions, type) => {
        const spec = createTaskSpecification('canvas:a', 'Activity', [source(instructions)]);
        expect(spec.instructions).toBe(instructions);
        expect(spec.activityType).toBe(type);
    });
    it('does not invent academic sections for ambiguous work', () => expect(createTaskSpecification('a', 'Activity', [source('Complete the attached activity.')]).requiredOrder).toEqual([]));
    it('distinguishes maximum, minimum and exact word limits and rejects conflicting counts', () => {
        expect(createTaskSpecification('a', 'A', [source('Write up to 500 words.')]).wordOrLengthRequirements).toMatchObject({ minWords: null, maxWords: 500 });
        expect(createTaskSpecification('a', 'A', [source('Write at least 100 words.')]).wordOrLengthRequirements).toMatchObject({ minWords: 100, maxWords: null });
        expect(() => createTaskSpecification('a', 'A', [source('Answer questions 5–1.')])).toThrow();
        expect(() => createTaskSpecification('a', 'A', [source('Create 3 slides.'), source('# Slide 1: Problem\n# Slide 2: Solution', 'template', 'template')])).toThrow();
    });
    it('recognizes template evidence beyond filename', () => expect(sourceRole('Activity.docx', 'Name: ____\nResponse: ____', 'Complete this', 'attachment')).toBe('template'));
    it('honors template and explicit assignment section precedence', () => {
        const template = source('# Objective\n# Materials\n# Results\n# Guide Questions', 'template', 'template');
        expect(createTaskSpecification('a', 'Lab', [source('Use this template.'), template]).requiredOrder).toEqual(['Objective', 'Materials', 'Results', 'Guide Questions']);
        expect(createTaskSpecification('a', 'Lab', [source('Required sections: Results, Questions'), template]).requiredOrder).toEqual(['Results', 'Questions']);
        expect(createTaskSpecification('a', 'Lab', [source('Use the template.'), template, source('Required sections: Abstract, Conclusion', 'attachment', 'attached')]).requiredOrder).toEqual(['Objective', 'Materials', 'Results', 'Guide Questions']);
    });
    it('uses questions from attached instructions for sparse Canvas instructions', () => expect(createTaskSpecification('a', 'Activity', [source('Use attached instructions.'), source('1. Define diffusion.\n2. Define osmosis.', 'attachment', 'attachment')]).requiredQuestions).toHaveLength(2));
    it('rejects conflicting templates rather than choosing silently', () => expect(() => createTaskSpecification('a', 'A', [source('Use template.'), source('# A', 'template', 'a'), source('# B', 'template', 'b')])).toThrow());
    it('validates exact answer count, resolving references, citations and empty output', () => {
        const sources = [source('Provide three reasons.'), source('Diffusion moves particles from high concentration to low concentration.', 'reference', 'ref')];
        const spec = createTaskSpecification('a', 'Activity', sources);
        expect(expectedParts(spec)).toBe(3);
        const part = { content: 'Diffusion moves particles.', missingInformation: false, evidence: [{ sourceId: 'ref', quote: sources[1]!.text }] };
        expect(validateGeneratedContent({ parts: [part, part, part] }, spec, sources)).toHaveLength(3);
        for (const parts of [[part, part], [{ ...part, content: '' }, part, part], [{ ...part, evidence: [{ sourceId: 'foreign', quote: 'missing source' }] }, part, part], [{ ...part, content: 'Diffusion moved 99 particles (Smith, 2024).' }, part, part]])
            expect(() => validateGeneratedContent({ parts }, spec, sources)).toThrow();
    });
    it('never fabricates missing source information', async () => {
        const sources = [source('Calculate the missing observation.')];
        const spec = createTaskSpecification('a', 'Activity', sources);
        const provider = { generate: vi.fn().mockResolvedValueOnce({ parts: [{ content: MISSING_INFORMATION, missingInformation: true, evidence: [] }] }).mockResolvedValueOnce({ instructionsSatisfied: true, sourcesSupportClaims: true, noInventedCitations: true, templateSatisfied: true }) } as unknown as GenerationProvider;
        const result = await generateActivity(provider, spec, sources);
        expect(result.warnings).toHaveLength(1);
        expect(result.content.sections[0]?.content).toBe(MISSING_INFORMATION);
    });
    it('independent semantic verification rejects unsupported paraphrases', async () => {
        const sources = [source('Explain diffusion. Diffusion moves particles.')];
        const spec = createTaskSpecification('a', 'Activity', sources);
        const provider = { generate: vi.fn().mockResolvedValueOnce({ parts: [{ content: 'Diffusion cures illness.', missingInformation: false, evidence: [{ sourceId: 'instructions', quote: 'Diffusion moves particles.' }] }] }).mockResolvedValueOnce({ instructionsSatisfied: true, sourcesSupportClaims: false, noInventedCitations: true, templateSatisfied: true }) } as unknown as GenerationProvider;
        await expect(generateActivity(provider, spec, sources)).rejects.toMatchObject({ code: 'activity_generation_failed' });
    });
    it('rejects one-paragraph violations and forbidden conclusions', () => {
        const sources = [source('Write one paragraph. No conclusion required. Diffusion moves particles.')];
        const spec = createTaskSpecification('a', 'Activity', sources);
        for (const content of ['Diffusion moves.\n\nParticles move.', '# Conclusion\nDiffusion moves.'])
            expect(() => validateGeneratedContent({ parts: [{ content, missingInformation: false, evidence: [{ sourceId: 'instructions', quote: 'Diffusion moves particles.' }] }] }, spec, sources)).toThrow();
    });
    it('client cannot supply trusted generation fields or edit draft identity', () => {
        for (const field of ['userId', 'provider', 'model', 'courseId', 'prompt', 'canvasToken'])
            expect(() => readGenerationInput({ mode: 'draft', [field]: 'untrusted' })).toThrow();
        expect(() => validateEditableContent({ title: 'X', sections: [], slides: [], user_id: 'other' }, [])).toThrow();
    });
    it('resolves only same-origin Canvas file/page links, including screenshots', () => {
        expect(assignmentLinks('<img src="/courses/1/files/42/preview"><a href="https://evil.test/files/99">bad</a><a href="/courses/1/pages/instructions">page</a>', 'https://canvas.test')).toEqual([{ kind: 'file', externalId: '42' }, { kind: 'page', externalId: 'instructions' }]);
    });
});
describe('Office structure extraction', () => {
    it('keeps DOCX heading order, split runs, numbered questions, tables and placeholders', () => {
        const numbering = '<w:numbering xmlns:w="urn:word"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>';
        const question = '<w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Define </w:t></w:r><w:r><w:t>diffusion.</w:t></w:r></w:p>';
        const bytes = docx(p('Objective', true) + p('Materials', true) + question + question + '<w:tbl><w:tr><w:tc>' + p('Result') + '</w:tc><w:tc>' + p('____') + '</w:tc></w:tr></w:tbl>', { 'word/numbering.xml': numbering });
        const text = extractOfficeText(bytes, 'docx');
        expect(text).toContain('# Objective\n\n# Materials');
        expect(text).toContain('1. Define diffusion.');
        expect(text).toContain('2. Define diffusion.');
        expect(text).toContain('| Result | ____ |');
    });
    it('uses presentation relationship order, title association, tables, and excludes decorative footer', () => {
        const slide = (title: string) => `<p:sld xmlns:p="urn:p" xmlns:a="urn:a"><p:sp><p:nvSpPr><p:nvPr><p:ph type="title"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>${title}</a:t></a:r></a:p></p:txBody></p:sp><p:sp><p:nvSpPr><p:nvPr><p:ph type="body"/></p:nvPr></p:nvSpPr><p:txBody><a:p/></p:txBody></p:sp><p:sp><p:nvSpPr><p:nvPr><p:ph type="ftr"/></p:nvPr></p:nvSpPr><p:txBody><a:p><a:r><a:t>Decorative school footer</a:t></a:r></a:p></p:txBody></p:sp></p:sld>`;
        const bytes = zip({ 'ppt/presentation.xml': '<p:presentation xmlns:p="urn:p" xmlns:r="urn:r"><p:sldIdLst><p:sldId r:id="r2"/><p:sldId r:id="r1"/></p:sldIdLst></p:presentation>', 'ppt/_rels/presentation.xml.rels': '<Relationships><Relationship Id="r1" Target="slides/slide1.xml"/><Relationship Id="r2" Target="slides/slide2.xml"/></Relationships>', 'ppt/slides/slide1.xml': slide('Solution'), 'ppt/slides/slide2.xml': slide('Problem') });
        const text = extractOfficeText(bytes, 'pptx');
        expect(text.indexOf('Slide 1: Problem')).toBeLessThan(text.indexOf('Slide 2: Solution'));
        expect(text).toContain('[empty field]');
        expect(text).not.toContain('Decorative');
    });
    it('rejects hostile XML, missing parts and active content', () => {
        expect(() => extractOfficeText(zip({ 'word/document.xml': '<!DOCTYPE x [<!ENTITY x "boom">]><x>&x;</x>' }), 'docx')).toThrow();
        expect(() => extractOfficeText(zip({ 'other.xml': '<x/>' }), 'docx')).toThrow();
        expect(() => extractOfficeText(docx(p('X'), { 'word/vbaProject.bin': 'payload' }), 'docx')).toThrow();
    });
});
