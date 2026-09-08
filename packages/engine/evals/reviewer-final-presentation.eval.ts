import {assertEqual, assertIncludes} from './assert.js';
import type {EvalCase, EvalIssue} from './types.js';
import type {NormalizedSource, NormalizedSourceBlock, PlannedSection, RequiredEvidenceTarget, SourceGroundedCore} from '../src/types.js';
import {assembleDeterministicSectionEvidence, attachGeneratedExplanation, validateDeterministicSectionEvidence} from '../src/reviewer-evidence-assembly.js';
import {buildResidualSourceEvidence, visibleResidualSourceEvidence, missingVisibleResidualSourceEvidence} from '../src/reviewer-source-ancestry.js';
import {completeSourcePredicate, presentDeterministicEvidence} from '../src/reviewer-evidence-presentation.js';
import {toDefaultStudentVisibleSectionOutput} from '../src/student-visible-text.js';
import {findMissingRequiredEvidenceTargets} from '../src/required-evidence.js';
import {diagnoseStudentVisibleUsefulness} from '../src/reviewer-usefulness.js';
import {standaloneSourceClause} from '../src/reviewer-presentation-prose.js';

const fact = 'The archive retains the record.';
const navigation = 'An example is shown below.';
function target(id: string, label: string, kind: RequiredEvidenceTarget['kind'] = 'concept', blockId = 'prose'): RequiredEvidenceTarget {
  return {id, kind, label, evidenceTexts:[label], sourceBlockIds:[blockId], provenance:[{sourceBlockId:blockId, sourceOrder:0}]};
}
function block(id: string, text: string, order = 0, type: 'paragraph' | 'code' = 'paragraph'): NormalizedSourceBlock {
  return {id,text,order,kind:type,structuredBlock:{id,text,order,type,role:'content',pageNumber:1,parentId:'group',provenance:{blockId:id,pageNumber:1,parser:'legacy'}}};
}
function section(targets: readonly RequiredEvidenceTarget[], title = 'Archive'): PlannedSection {
  const ids = [...new Set(targets.flatMap(t=>t.sourceBlockIds))];
  return {id:'section',title,sourceSectionId:'source-section',order:0,schemaKind:'concept-card',sourceBlockIds:ids,
    tokenWeight:40,targetItemCount:targets.length,sourceStartOffset:0,sourceEndOffset:1000,
    target:{objective:'Explain the archive.',focus:'Archive',itemCount:targets.length,requiredSourceBlockIds:ids,expectedTags:['concept'],coverageRules:[]},
    requiredEvidence:targets,reviewerDisposition:'standalone'};
}
function output(targets: readonly RequiredEvidenceTarget[], explanation = fact) {
  const plan = section(targets);
  const blocks = [...new Set(targets.flatMap(t=>t.sourceBlockIds))].map((id,i)=>
    block(id,targets.filter(t=>t.sourceBlockIds.includes(id)).map(t=>t.label).join('\n'),i));
  const raw = assembleDeterministicSectionEvidence({section:plan,sourceBlocks:blocks});
  return {plan,raw,visible:toDefaultStudentVisibleSectionOutput(attachGeneratedExplanation(raw, explanation))};
}
const code = {...target('code','const record = 42;','code'),sourceBlockIds:['prose','code']};
function residual(text: string, targets: readonly RequiredEvidenceTarget[] = [code]) {
  const spans=buildResidualSourceEvidence({title:'Archive',targets,sourceBlocks:[block('prose',text),block('code',code.label,1,'code')]});
  const core=presentDeterministicEvidence(targets,spans);
  return {spans,core,text:core.keyPoints.join(' ')};
}
function diagnose(core: SourceGroundedCore, targets: readonly RequiredEvidenceTarget[] = []) {
  const o=output(targets);
  return diagnoseStudentVisibleUsefulness({section:o.plan,source:{id:'source',blocks:[]} as unknown as NormalizedSource,
    output:{...o.visible,sourceCore:{evidence:[],...core}}});
}
const check=(name:string, run:()=>readonly EvalIssue[]):EvalCase=>({name:`B19.2 ${name}`,run:async()=>run()});
export function finalPresentationRegressionCases(): readonly EvalCase[] {
  return [
    check('typed source referent proves pure navigation removal',()=>assertEqual(residual(navigation).text,'','Navigation leaked.')),
    check('target-owned instructional-sounding content survives',()=>assertIncludes(residual(navigation,[target('required',navigation),code]).text,navigation,'Required command removed.')),
    check('ambiguous navigation without source referent survives',()=>assertIncludes(residual(navigation,[]).text,navigation,'Ambiguous source removed.')),
    check('heading completes a modal predicate',()=>assertEqual(completeSourcePredicate('Records','can retain values.'),'Records can retain values.','Subject missing.')),
    check('unrelated heading cannot supply a subject',()=>assertEqual(completeSourcePredicate('Archives','can retain values.','Records'),'can retain values.','Unrelated subject added.')),
    check('explanation sentence and key point display once',()=>assertEqual(output([target('fact',fact)],`${fact} The file records changes.`).visible.sourceCore.keyPoints.length,0,'Exact duplicate remains.')),
    check('similar wording with different facts remains distinct',()=>assertEqual(output([target('one','The archive retains 42 records.'),target('two','The archive retains 43 records.')],'The archive stores files.').visible.sourceCore.keyPoints.length,2,'Distinct fact removed.')),
    check('unique residual survives child subtraction',()=>assertIncludes(residual(`${fact} ${code.label}`).text,fact,'Unique sentence removed.')),
    check('mixed residual removes only navigation sentence',()=>assertEqual(residual(`${fact} ${code.label} ${navigation}`).text,fact,'Mixed residual not cleaned.')),
    check('mixed residual retains child code exactly once',()=>assertEqual(residual(`${fact} ${code.label} ${navigation}`).core.evidence?.filter(b=>b.text===code.label).length,1,'Child code lost or repeated.')),
    check('relationship label owns repeated child labels once',()=>{
      const ts=[target('parent','Archive records'),{...target('child','The record retains 42.'),relationshipLabel:'Archive records'}];
      return assertEqual(presentDeterministicEvidence(ts).keyPoints.filter(p=>p==='Archive records').length,1,'Relationship label repeated.');
    }),
    check('unknown relationship label stays visible',()=>assertIncludes(presentDeterministicEvidence([{...target('child',fact),relationshipLabel:'Other archive'}]).keyPoints.join(' '),'Other archive','Required relationship lost.')),
    check('existing subject is not repeatedly prefixed',()=>assertEqual(completeSourcePredicate('Archive',fact),fact,'Heading repeated.')),
    check('short valid definition is not a fragment',()=>assertEqual(diagnose({explanation:'Ice is water.',keyPoints:[]}).some(i=>i.type.startsWith('FRAGMENT')),false,'Valid short definition flagged.')),
    check('table cell is not classified as prose',()=>assertEqual(diagnose({explanation:fact,keyPoints:[],evidence:[{kind:'table',text:'Label | The'}]}).some(i=>i.type.startsWith('FRAGMENT')),false,'Table grammar checked.')),
    check('formula is not classified as prose',()=>assertEqual(diagnose({explanation:fact,keyPoints:[],evidence:[{kind:'formula',text:'x = a'}]}).some(i=>i.type.startsWith('FRAGMENT')),false,'Formula grammar checked.')),
    check('incomplete prose key point is detected',()=>assertEqual(diagnose({explanation:fact,keyPoints:['The record contains the']}).some(i=>i.type==='FRAGMENTARY_KEY_POINT'),true,'Incomplete prose missed.')),
    check('incomplete dependent clause is detected',()=>assertEqual(diagnose({explanation:fact,keyPoints:['Since the archive is empty,']}).some(i=>i.type==='FRAGMENTARY_KEY_POINT'),true,'Dependent clause missed.')),
    check('exact nearby prose repetition is detected',()=>assertEqual(diagnose({explanation:fact,keyPoints:[fact]}).some(i=>i.type==='REPETITION'),true,'Repetition missed.')),
    check('distant distinct source repetition remains visible',()=>{
      const ts=[target('first',fact,'concept','first'),target('other','The file stores changes.','concept','other'),target('last',fact,'concept','last')];
      return assertEqual(output(ts,'The archive stores files.').visible.sourceCore.keyPoints.filter(p=>p===fact).length,2,'Distant fact erased.');
    }),
    check('533 synthetic target identities survive serialization',()=>{
      const ts=Array.from({length:533},(_,i)=>target(`fact-${i}`,`The record retains value ${i}.`,'concept',`block-${i}`));
      const o=output(ts,'The archive stores files.');
      return [...assertEqual(o.raw.deterministicEvidence?.targetIds.length,533,'Identity count changed.'),...assertEqual(findMissingRequiredEvidenceTargets(o.plan,JSON.parse(JSON.stringify(o.visible))).length,0,'Serialized target lost.')];
    }),
    check('provider cannot replace deterministic display ownership',()=>{
      const o=output([target('fact',fact)]);
      return assertEqual(validateDeterministicSectionEvidence(o.plan,{...o.raw,deterministicEvidence:{...o.raw.deterministicEvidence!,presentation:{explanation:'Provider fact.',keyPoints:[]}}}).valid,false,'Provider evidence accepted.');
    }),
    check('navigation edit retains source text and source identity',()=>{
      const r=residual('As seen in the previous slide, the archive retains the record.');
      const span=visibleResidualSourceEvidence(r.spans)[0]!;
      return [...assertEqual(span.sourceBlockId,'prose','Identity changed.'),...assertIncludes(span.text,'previous slide','Source text overwritten.'),...assertEqual(missingVisibleResidualSourceEvidence(r.spans,r.core).length,0,'Projected fact missing.')];
    }),
    check('removing the projected factual clause is still an omission',()=>{
      const r=residual('As seen in the previous slide, the archive retains the record.');
      return assertEqual(missingVisibleResidualSourceEvidence(r.spans,{explanation:'',keyPoints:[]}).length,1,'Navigation proof hid a fact.');
    }),
    check('ordered table owns exact cross-row mapping span',()=>{
      const rows=['Region | Count','North | 42','South | 43'].map((label,i)=>({...target(`row-${i}`,label,'table-row','table'),provenance:[{sourceBlockId:'table',sourceOrder:0,tableBlockId:'table',tableRowIndex:i}]}));
      const ts=[target('mapping','42 South','mapping','table'),...rows];
      const core=presentDeterministicEvidence(ts);
      const o=output(ts);
      return [...assertEqual(core.keyPoints.length,0,'Cross-row fragment repeated.'),...assertEqual(findMissingRequiredEvidenceTargets(o.plan,o.visible).length,0,'Mapping lost.'),...assertEqual(core.evidence?.[0]?.text,rows.map(r=>r.label).join('\n'),'Rows changed.')];
    }),
    check('similar cross-row numbers cannot prove ownership',()=>{
      const rows=['Region | Count','North | 42','South | 43'].map((label,i)=>({...target(`row-${i}`,label,'table-row','table'),provenance:[{sourceBlockId:'table',sourceOrder:0,tableBlockId:'table',tableRowIndex:i}]}));
      return assertIncludes(presentDeterministicEvidence([target('mapping','43 North','mapping','table'),...rows]).keyPoints.join(' '),'43 North','Noncontiguous fact erased.');
    }),
    check('passive predicate receives only heading and copula',()=>assertEqual(completeSourcePredicate('Archive','prepared before any changes are made'),'Archive is prepared before any changes are made','Unsafe passive completion.')),
    check('author metadata is not treated as a passive predicate',()=>assertEqual(completeSourcePredicate('Archive','PREPARED BY:Ada'),'PREPARED BY:Ada','Metadata expanded.')),
    check('source objective and following worked example prove scaffolding',()=>{
      const example={...target('example','Recorded total = 42','example','example'),provenance:[{sourceBlockId:'example',sourceOrder:1}]};
      const spans=buildResidualSourceEvidence({title:'Computation of the total',targets:[example],sourceBlocks:[block('prose','Find the total of the following values.'),block('example',example.label,1)]});
      return assertEqual(visibleResidualSourceEvidence(spans).length,0,'Proven scaffolding retained.');
    }),
    check('different objective cannot be suppressed by an unrelated example',()=>{
      const example={...target('example','Recorded total = 42','example','example'),provenance:[{sourceBlockId:'example',sourceOrder:1}]};
      const spans=buildResidualSourceEvidence({title:'Archive',targets:[example],sourceBlocks:[block('prose','Find the total of the following values.'),block('example',example.label,1)]});
      return assertEqual(visibleResidualSourceEvidence(spans).length,1,'Unrelated heading erased a task.');
    }),
    check('exact local heading prefix is not embedded in a child fact',()=>{
      const t=target('fact',`Archive ${fact}`);
      const o=output([t]);
      return [...assertEqual(o.visible.sourceCore.keyPoints.length,0,'Heading-prefixed duplicate remained.'),...assertEqual(findMissingRequiredEvidenceTargets(o.plan,o.visible).length,0,'Heading-owned span lost.')];
    }),
    check('complete source-owned atomic facts are not an optional source dump',()=>{
      const ts=Array.from({length:10},(_,i)=>target(`fact-${i}`,`The archived record with index ${i} retains the original value and its complete source text for verification.`,'concept',`block-${i}`));
      const o=output(ts,'The archive stores files.');
      const source={id:'source',blocks:ts.map((t,i)=>block(t.sourceBlockIds[0]!,t.label,i))} as unknown as NormalizedSource;
      return assertEqual(diagnoseStudentVisibleUsefulness({section:o.plan,source,output:o.visible}).some(i=>i.type==='SOURCE_DUMP'),false,'Required atomic facts called optional.');
    }),
    check('oversized individual source prose is still a dump',()=>{
      const t=target('large',Array.from({length:80},()=> 'record').join(' '));
      const o=output([t],'The archive stores files.');
      return assertEqual(diagnoseStudentVisibleUsefulness({section:o.plan,source:{blocks:[]} as unknown as NormalizedSource,output:o.visible}).some(i=>i.type==='SOURCE_DUMP'),true,'Oversized passage exemption introduced.');
    }),
    check('same code-owned prose prefix has one display owner',()=>{
      const ts=[target('first',`${fact} const first = 42;`,'code'),target('second',`${fact} const second = 43;`,'code'),target('first-code','const first = 42;','code'),target('second-code','const second = 43;','code')];
      return assertEqual(presentDeterministicEvidence(ts).keyPoints.filter(p=>p===fact).length,1,'Same source prose prefix repeated.');
    }),
    check('factual since-clause becomes a standalone source statement',()=>assertEqual(standaloneSourceClause('Since there are 7 records,'),'There are 7 records.','Factual clause not completed.')),
    check('conditional source clause is never asserted as a fact',()=>assertEqual(standaloneSourceClause('If there are 7 records,'),'If there are 7 records,','Hypothesis asserted.')),
    check('incomplete since-clause is retained conservatively',()=>assertEqual(standaloneSourceClause('Since the archive opened,'),'Since the archive opened,','Temporal phrase guessed.')),
    ...[true,false].map(continuationVisible=>check(`clipped article ${continuationVisible?'uses visible next source owner':'cannot be hidden without its continuation'}`,()=>{
      const ts=[target('clipped','Review use The')];
      const spans=buildResidualSourceEvidence({title:'Archive',targets:ts,sourceBlocks:[block('prose','Review use'),block('next','The archive contains three columns.',1)]});
      const plan={...section(ts),residualSourceEvidence:spans};
      const core=presentDeterministicEvidence(ts,spans);
      const raw=output(ts).raw;
      const {deterministicEvidence:_,...visible}=raw;
      const edited={...visible,sourceCore:{...core,keyPoints:continuationVisible?core.keyPoints:core.keyPoints.filter(p=>p!=='The archive contains three columns.')}};
      return [...assertEqual(core.keyPoints[0],'Review use','Article stayed on wrong unit.'),...assertEqual(findMissingRequiredEvidenceTargets(plan,edited).length,continuationVisible?0:1,'Continuation visibility was not enforced.')];
    })),
    check('unrelated next source unit cannot absorb a clipped article',()=>{
      const ts=[target('clipped','Review use The')];
      const spans=buildResidualSourceEvidence({title:'Archive',targets:ts,sourceBlocks:[block('prose','Review use'),block('next','Another archive contains records.',1)]});
      return assertIncludes(presentDeterministicEvidence(ts,spans).keyPoints.join(' '),'Review use The','Unrelated continuation guessed.');
    }),
    check('complete original source label cannot be shortened',()=>{
      const ts=[target('clipped','Review use The')];
      const spans=buildResidualSourceEvidence({title:'Archive',targets:ts,sourceBlocks:[block('prose','Review use The'),block('next','The archive contains records.',1)]});
      return assertIncludes(presentDeterministicEvidence(ts,spans).keyPoints.join(' '),'Review use The','Complete source label shortened.');
    }),
    check('matching prose result owns the single explanation display',()=>{
      const ts=[target('result','The recorded total is 42.','result-value')];
      const o=output(ts,'The recorded total is 42.');
      return [...assertEqual(o.visible.sourceCore.evidence?.length,0,'Prose result duplicated.'),...assertEqual(findMissingRequiredEvidenceTargets(o.plan,o.visible).length,0,'Source result lost.')];
    }),
    check('provider paraphrase cannot replace the factual result',()=>{
      const o=output([target('result','The recorded total is 42.','result-value')],'The recorded total is 43.');
      return assertEqual(o.visible.sourceCore.evidence?.[0]?.text,'The recorded total is 42.','Provider gained factual ownership.');
    }),
    check('heading serving as sentence subject is retained',()=>{
      const text='Archive stores the original records.';
      return assertEqual(presentDeterministicEvidence([target('subject',text)],[],'Archive').keyPoints[0],text,'Sentence subject removed.');
    }),
    check('parenthetical symbol does not make a subject redundant',()=>{
      const text='The total (symbol T) is the sum of values.';
      return assertEqual(presentDeterministicEvidence([target('subject',text)],[],'1. THE TOTAL').keyPoints[0],text,'Parenthetical subject removed.');
    }),
  ];
}
