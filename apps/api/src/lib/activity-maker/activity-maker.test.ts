import { strToU8,zipSync } from 'fflate';
import { describe,expect,it } from 'vitest';
import { extractOfficeText } from './office-extraction';
import { readGenerationInput,validateEditableContent } from './service';
import { assignmentLinks } from './sources';
const zip = (parts: Record<string, string>) => zipSync(Object.fromEntries(Object.entries(parts).map(([k, v]) => [k, strToU8(v)])));
const docx = (body: string, extra: Record<string, string> = {}) => zip({ 'word/document.xml': `<w:document xmlns:w="urn:word"><w:body>${body}</w:body></w:document>`, ...extra });
const p = (s: string, heading = false) => `<w:p>${heading ? '<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>' : ''}<w:r><w:t>${s}</w:t></w:r></w:p>`;
describe('Activity input contracts', () => {
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
