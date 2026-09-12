import { unzipSync } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { posix } from 'node:path';
export const OFFICE_MIME = {
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
} as const;
type Node = Record<string, unknown>;
function nodes(value: unknown): Node[] { return Array.isArray(value) ? value.filter((n): n is Node => typeof n === 'object' && n !== null) : []; }
function children(node: Node, key: string) { return nodes(node[key]); }
function attr(node: Node, name: string): string { const attrs = node[':@']; return attrs && typeof attrs === 'object' ? String((attrs as Node)[`@_${name}`] ?? '') : ''; }
function all(tree: Node[], key: string): Node[] { return tree.flatMap(n => [...(key in n ? [n] : []), ...Object.entries(n).filter(([k]) => k !== ':@').flatMap(([, v]) => all(nodes(v), key))]); }
function text(tree: Node[]): string { return tree.map(n => typeof n['#text'] === 'string' ? n['#text'] : Object.entries(n).filter(([k]) => ![':@', 'w:del', 'w:instrText'].includes(k)).map(([k, v]) => k === 'w:tab' ? '\t' : /^(w:br|a:br)$/.test(k) ? '\n' : text(nodes(v))).join('')).join(''); }
function xml(value: Uint8Array | undefined): Node[] {
    if (!value)
        throw new Error('office_part_missing');
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(value);
    if (/<!DOCTYPE|<!ENTITY/i.test(decoded) || XMLValidator.validate(decoded) !== true)
        throw new Error('office_xml_invalid');
    return nodes(new XMLParser({ preserveOrder: true, ignoreAttributes: false, parseTagValue: false, trimValues: false, processEntities: true }).parse(decoded));
}
/** Only bounded XML parts are expanded. Nothing is written to disk or fetched. */
export function extractOfficeText(bytes: Uint8Array, kind: 'docx' | 'pptx'): string {
    if (bytes.length > 20000000)
        throw new Error('office_too_large');
    let expanded = 0;
    let entries = 0;
    const names = new Set<string>();
    const parts = unzipSync(bytes, { filter(entry) {
            if (++entries > 2000 || names.has(entry.name) || /(^\/|\\|(^|\/)\.\.(\/|$))/.test(entry.name))
                throw new Error('office_archive_invalid');
            names.add(entry.name);
            if (/vbaProject|activeX|embeddings/i.test(entry.name))
                throw new Error('office_active_content');
            const relevant = /^(word\/(document|styles|numbering)\.xml|ppt\/presentation\.xml|ppt\/_rels\/presentation\.xml\.rels|ppt\/slides\/slide\d+\.xml)$/.test(entry.name);
            if (!relevant)
                return false;
            expanded += entry.originalSize;
            if (entry.originalSize > 4000000 || expanded > 12000000)
                throw new Error('office_too_large');
            return true;
        } });
    const result = kind === 'docx' ? docx(parts) : pptx(parts);
    if (!result.trim() || result.length > 120000)
        throw new Error('office_unreadable');
    return result.trim();
}
function docx(parts: Record<string, Uint8Array>): string {
    const tree = xml(parts['word/document.xml']);
    const body = all(tree, 'w:body')[0];
    if (!body)
        throw new Error('office_body_missing');
    const styles = parts['word/styles.xml'] ? all(xml(parts['word/styles.xml']), 'w:style') : [];
    const numbering = parts['word/numbering.xml'] ? xml(parts['word/numbering.xml']) : [];
    const counters = new Map<string, number>();
    function paragraph(p: Node): string {
        const pTree = children(p, 'w:p');
        let value = text(pTree).trim();
        const styleId = attr(all(pTree, 'w:pStyle')[0] ?? {}, 'w:val');
        const style = styles.find(s => attr(s, 'w:styleId') === styleId);
        const outline = all(pTree, 'w:outlineLvl')[0] ?? (style ? all(children(style, 'w:style'), 'w:outlineLvl')[0] : undefined);
        const heading = outline ? Number(attr(outline, 'w:val')) + 1 : Number(styleId.match(/heading([1-6])/i)?.[1] ?? 0);
        const numId = attr(all(pTree, 'w:numId')[0] ?? {}, 'w:val');
        if (numId) {
            const level = attr(all(pTree, 'w:ilvl')[0] ?? {}, 'w:val') || '0';
            const num = all(numbering, 'w:num').find(n => attr(n, 'w:numId') === numId);
            const abstractId = num ? attr(all(children(num, 'w:num'), 'w:abstractNumId')[0] ?? {}, 'w:val') : '';
            const abstract = all(numbering, 'w:abstractNum').find(n => attr(n, 'w:abstractNumId') === abstractId);
            const lvl = abstract ? all(children(abstract, 'w:abstractNum'), 'w:lvl').find(n => attr(n, 'w:ilvl') === level) : undefined;
            const format = lvl ? attr(all(children(lvl, 'w:lvl'), 'w:numFmt')[0] ?? {}, 'w:val') : 'decimal';
            const key = `${numId}:${level}`;
            const count = (counters.get(key) ?? (Number(lvl ? attr(all(children(lvl, 'w:lvl'), 'w:start')[0] ?? {}, 'w:val') : '1') || 1) - 1) + 1;
            counters.set(key, count);
            value = `${'  '.repeat(Math.min(Number(level) || 0, 8))}${format === 'bullet' ? '-' : `${count}.`} ${value || '[empty field]'}`;
        }
        if (!value && all(pTree, 'w:sdt').length)
            value = '[empty field]';
        return value && heading > 0 && heading <= 6 ? `${'#'.repeat(heading)} ${value}` : value;
    }
    function blocks(tree: Node[]): string[] {
        return tree.flatMap(n => {
            if ('w:p' in n)
                return [paragraph(n)];
            if ('w:tbl' in n)
                return all(children(n, 'w:tbl'), 'w:tr').map(row => '| ' + children(row, 'w:tr').filter(c => 'w:tc' in c).map(cell => blocks(children(cell, 'w:tc')).filter(Boolean).join(' / ') || '[empty field]').join(' | ') + ' |');
            if ('w:del' in n)
                return [];
            return Object.entries(n).filter(([k]) => k !== ':@').flatMap(([, v]) => blocks(nodes(v)));
        });
    }
    return blocks(children(body, 'w:body')).filter(Boolean).join('\n\n');
}
function pptx(parts: Record<string, Uint8Array>): string {
    const presentation = xml(parts['ppt/presentation.xml']);
    const relations = all(xml(parts['ppt/_rels/presentation.xml.rels']), 'Relationship');
    const slides = all(presentation, 'p:sldId');
    if (!slides.length || slides.length > 100)
        throw new Error('office_slides_invalid');
    return slides.map((slide, i) => {
        const relation = relations.find(r => attr(r, 'Id') === attr(slide, 'r:id'));
        if (!relation || attr(relation, 'TargetMode') === 'External')
            throw new Error('office_slide_relationship');
        const path = posix.normalize(posix.join('ppt', attr(relation, 'Target')));
        if (!/^ppt\/slides\/slide\d+\.xml$/.test(path))
            throw new Error('office_slide_relationship');
        const tree = xml(parts[path]);
        let title = '';
        const body: string[] = [];
        for (const shape of all(tree, 'p:sp')) {
            const shapeTree = children(shape, 'p:sp');
            const ph = all(shapeTree, 'p:ph')[0];
            const type = ph ? attr(ph, 'type') || 'obj' : '';
            if (['dt', 'ftr', 'sldNum'].includes(type))
                continue;
            const content = all(shapeTree, 'a:p').map(p => {
                const level = Number(attr(all(children(p, 'a:p'), 'a:pPr')[0] ?? {}, 'lvl') || '0');
                return '  '.repeat(Math.min(level, 8)) + text(children(p, 'a:p')).trim();
            }).filter(s => s.trim()).join('\n');
            if (type === 'title' || type === 'ctrTitle')
                title = content || '[empty title]';
            else if (content || ph)
                body.push(content || '[empty field]');
        }
        for (const row of all(tree, 'a:tr'))
            body.push('| ' + children(row, 'a:tr').filter(c => 'a:tc' in c).map(c => text(children(c, 'a:tc')).trim() || '[empty field]').join(' | ') + ' |');
        return `# Slide ${i + 1}: ${title || '[empty title]'}\n\n${body.join('\n\n')}`;
    }).join('\n\n');
}
