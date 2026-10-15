import { describe,expect,it } from 'vitest';
import { request } from './fixtures';
import { readQuizRequest,regionsFromBlocks } from './sources';
describe('Quiz source contracts and coverage', () => {
    it('threads a trimmed optional title and rejects oversized or non-text titles', () => {
        expect(readQuizRequest({ ...request, title: '  Photosynthesis — 10 questions  ' }).title).toBe('Photosynthesis — 10 questions');
        expect(readQuizRequest({ ...request, title: ' ' }).title).toBeUndefined();
        expect(readQuizRequest(request).title).toBeUndefined();
        for (const title of [42, null, 'x'.repeat(201), 'title\nwith control'])
            expect(() => readQuizRequest({ ...request, title })).toThrow('invalid_request');
    });
    it.each([5, 10, 15, 20, 50, 100])('accepts bounded count %i', questionCount => expect(readQuizRequest({ ...request, questionCount }).questionCount).toBe(questionCount));
    it.each([0, 4, 101, 100000, 5.5, NaN])('rejects abusive count %i', questionCount => expect(() => readQuizRequest({ ...request, questionCount })).toThrow());
    it.each([{ userId: 'foreign' }, { courseId: 'foreign' }, { provider: 'x' }, { model: 'x' }, { sourceIds: [] }, { sourceIds: ['https://evil.test'] }, { questionTypes: [] }, { questionTypes: ['free_response'] }, { difficulty: 'expert' }])('rejects unsafe input %j', change => expect(() => readQuizRequest({ ...request, ...change })).toThrow());
    it('requires a nonempty unique topic selection when topics are specified', () => {
      expect(readQuizRequest({ ...request, selectedTopicIds: ['topic-1'] }).selectedTopicIds).toEqual(['topic-1']);
      expect(() => readQuizRequest({ ...request, selectedTopicIds: [] })).toThrow();
      expect(() => readQuizRequest({ ...request, selectedTopicIds: ['topic-1', 'topic-1'] })).toThrow();
    });
    it('accepts reviewer source and rejects mismatched reviewer association', () => {
        const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
        expect(readQuizRequest({ ...request, sourceType: 'reviewer', sourceIds: [id], reviewerArtifactId: id }).sourceType).toBe('reviewer');
        expect(() => readQuizRequest({ ...request, sourceType: 'reviewer', sourceIds: [id], reviewerArtifactId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' })).toThrow();
    });
    it('preserves heading text, document order, pages and slides', () => {
      const blocks = [{id:'h',kind:'heading',text:'Mean'}, {id:'b',kind:'paragraph',text:'Sum divided by count.',page:4,slide:3}];
      const regions = regionsFromBlocks('page:1','Material',blocks,{sections:[{id:'s1',title:'Mean'}]});
      expect(regions.map(r=>r.text).join('\n')).toBe('Mean\nSum divided by count.');
      expect(regions.flatMap(r=>r.sourceRefs)).toContainEqual({materialId:'page:1',regionId:'b',page:4,slide:3});
      expect(regions[0]!.reviewerSectionIds).toEqual(['s1']);
    });
});
