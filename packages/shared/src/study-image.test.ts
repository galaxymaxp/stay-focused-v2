import { expect, it } from 'vitest';
import { STUDY_IMAGE_SUGGESTIONS, STUDY_TOOLS_PROMPT_VERSION, studyCacheKey, type StudyToolRequest } from './study-tools';

it('keeps the four static image suggestions in their specified order',()=>{
  expect(STUDY_IMAGE_SUGGESTIONS).toEqual(['What is this?','What does it mean?','Explain the parts','Why is it in this lesson?']);
});
it('separates image kind, exact image id, section and prompt in cache identity',()=>{
  const request:StudyToolRequest={reviewerId:'r',sectionId:'s',blockId:'b',contentHash:'h',promptVersion:STUDY_TOOLS_PROMPT_VERSION,
    selection:'Cell',action:'ask',question:'What is this?',image:{kind:'figure',id:'one'}};
  const key=studyCacheKey(request);
  for(const changed of [{image:{kind:'figure' as const,id:'two'}},{image:{kind:'external_visual' as const,id:'one'}},{image:undefined},
    {sectionId:'other'},{promptVersion:'study-tools-v2'}]) expect(studyCacheKey({...request,...changed})).not.toBe(key);
  expect(studyCacheKey({...request})).toBe(key);
});
