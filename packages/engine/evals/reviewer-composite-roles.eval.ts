import {assertEqual, assertIncludes} from './assert.js';
import type {EvalCase} from './types.js';
import type {RequiredEvidenceTarget, TypedEvidenceGroup, PlannedSection} from '../src/types.js';
import {presentDeterministicEvidence} from '../src/reviewer-evidence-presentation.js';
import {buildSourceRepresentationMap,buildSourceRoleRepresentationMap} from '../src/reviewer-source-representation.js';
import {findMissingRequiredEvidenceTargets} from '../src/required-evidence.js';
const definition='Resistance opposes current flow.';
const objective='Example: Find the resistance of the circuit.';
const components=['V = voltage','I = current'];
function fixture(command=objective) {
 const units=[definition,'R = V / I',...components,command,'Voltage | Current\n12 | 3\n24 | 6','R = 4 ohms'];
 const members=units.map((text,i)=>({blockId:`unit-${i}`,kind:i===1?'formula' as const:i===5?'table' as const:'paragraph' as const,evidenceTexts:[text],...(i===5?{tableCells:text.split('\n').flatMap((row,r)=>row.split(' | ').map((text,c)=>({tableBlockId:'unit-5',cellId:`cell-${r}-${c}`,rowIndex:r,columnIndex:c,rowSpan:1,columnSpan:1,text,pageNumber:1})))}:{})}));
 const group:TypedEvidenceGroup={id:'circuit',label:'Resistance',sourceBlockIds:members.map(m=>m.blockId),formulaBlockIds:['unit-1'],tableBlockIds:['unit-5'],codeBlockIds:[],resultBlockIds:['unit-6'],members};
 const target=(id:string,label:string,kind:RequiredEvidenceTarget['kind'],ids:readonly string[]):RequiredEvidenceTarget=>({id,label,kind,evidenceTexts:[label],sourceBlockIds:ids,provenance:ids.map(id=>({sourceBlockId:id,sourceOrder:group.sourceBlockIds.indexOf(id),evidenceGroupId:group.id}))});
 const composite=target('composite',[definition,...components,command,'Voltage'].join(' '),'mapping',group.sourceBlockIds);
 const rows=units[5]!.split('\n').map((text,i)=>({...target(`row-${i}`,text,'table-row',['unit-5']),provenance:[{sourceBlockId:'unit-5',sourceOrder:5,evidenceGroupId:group.id,tableBlockId:'unit-5',tableRowIndex:i}],tableCells:members[5]!.tableCells!.filter(c=>c.rowIndex===i)}));
 const targets=[composite,target('formula',units[1]!,'formula',['unit-1']),...rows,target('result',units[6]!,'result-value',['unit-6'])];
 // Extra argument is deliberately invoked via a compatible function type so
 // the same regression runs against the exact pre-repair implementation.
 const present: (t:readonly RequiredEvidenceTarget[],r:[],title:string,g:readonly TypedEvidenceGroup[])=>ReturnType<typeof presentDeterministicEvidence>=presentDeterministicEvidence;
 const core=present(targets,[],'Resistance',[group]);
 const plan={id:'circuit',title:'Resistance',requiredEvidence:targets,evidenceGroups:[group]} as unknown as PlannedSection;
 const output={id:'output',plannedSectionId:plan.id,title:plan.title,kind:'concept-card',sourceBlockIds:group.sourceBlockIds,sourceCore:core,enrichment:null} as const;
 return {core,targets,group,output,plan,rows};
}
const text=(f:ReturnType<typeof fixture>)=>[...f.core.keyPoints,...(f.core.evidence??[]).map(e=>e.text)].join('\n');
export function compositeRoleRegressionCases():readonly EvalCase[]{
 const check=(name:string,run:EvalCase['run']):EvalCase=>({name:`B19.3 ${name}`,run});
 return [
 check('A definition and exercise have independent display owners',async()=>{const f=fixture();return [...assertEqual(f.core.keyPoints.includes(definition),true,'Definition remains fused.'),...assertEqual(f.core.keyPoints.some(p=>p.includes(objective)),false,'Exercise pollutes definition.'),...assertIncludes(text(f),'R = 4 ohms','Result lost.'),...assertEqual(findMissingRequiredEvidenceTargets(f.plan,f.output).length,0,'Owner lost.')];}),
 check('B formula components follow their formula independently',async()=>{const f=fixture();const es=f.core.evidence??[];return [...assertEqual(es[0]?.text,'R = V / I','Formula not first.'),...assertEqual(es[1]?.text,components[0],'First component fused.'),...assertEqual(es[2]?.text,components[1],'Second component fused.')];}),
 check('C supported exercise is separate from concept prose',async()=>{const f=fixture();return assertEqual(f.core.evidence?.some(e=>e.kind==='example'&&e.text===objective),true,'Exercise not separated.');}),
 check('D unresolved command remains required',async()=>{const f=fixture('Find the faulty circuit without measurements.');return assertIncludes(text(f),'Find the faulty circuit without measurements.','Unresolved command lost.');}),
 check('E table header belongs to the complete ordered table',async()=>{const f=fixture();return [...assertEqual(f.core.keyPoints.some(p=>p.includes('Voltage')),false,'Header remains in prose.'),...assertEqual(f.core.evidence?.find(e=>e.kind==='table')?.text,f.rows.map(r=>r.label).join('\n'),'Rows changed.')];}),
 check('F non-Statistics science content is role-based',async()=>{const f=fixture();return assertEqual(f.core.keyPoints.join('\n'),definition,'Science source roles fused.');}),
 check('scalar source units never split mathematical or ordinal prose',async()=>{
  const f=fixture('Find the 2 nd circuit where n/2 is recorded.');
  const group={...f.group,members:[...f.group.members,{blockId:'scalar',kind:'paragraph' as const,evidenceTexts:['2']}]};
  const targets=f.targets.map(t=>t.id==='composite'?{...t,sourceBlockIds:[...t.sourceBlockIds,'scalar']}:t);
  const core=presentDeterministicEvidence(targets,[],'Resistance',[group]);
  return assertEqual(core.evidence?.some(e=>e.text==='Find the 2 nd circuit where n/2 is recorded.'),true,'Scalar split a source unit.');
 }),
 check('missing source relationships preserve the composite',async()=>{
  const f=fixture();const core=presentDeterministicEvidence(f.targets,[],'Resistance');
  return assertIncludes(core.keyPoints.join(' '),objective,'Structure invented without source boundaries.');
 }),
 check('display projection does not mutate factual owners or typed payloads',async()=>{
  const f=fixture();const before=JSON.stringify({targets:f.targets,groups:f.group,map:[...buildSourceRepresentationMap(f.targets).owners]});
  buildSourceRoleRepresentationMap(f.targets,[f.group]);
  return assertEqual(JSON.stringify({targets:f.targets,groups:f.group,map:[...buildSourceRepresentationMap(f.targets).owners]}),before,'Frozen input changed.');
 }),
 check('incomplete table ownership preserves unmatched heading text',async()=>{
  const f=fixture();const core=presentDeterministicEvidence(f.targets.filter(t=>t.id!=='row-2'),[],'Resistance',[f.group]);
  return assertIncludes(core.keyPoints.join(' '),'Voltage','Incomplete table discharged a header.');
 }),
 check('table row order follows provenance despite manifest order',async()=>{
  const f=fixture();const targets=[...f.targets.filter(t=>t.kind!=='table-row'),...f.rows.slice().reverse()];
  const core=presentDeterministicEvidence(targets,[],'Resistance',[f.group]);
  return assertEqual(core.evidence?.find(e=>e.kind==='table')?.text,f.rows.map(r=>r.label).join('\n'),'Row order changed.');
 }),
 check('caption is separated from exercise and retained beside table',async()=>{
  const f=fixture();const caption='Read the current from the instrument.';
  const group={...f.group,members:f.group.members.map(m=>m.kind==='table'?{...m,evidenceTexts:[caption+'\n'+m.evidenceTexts[0]]}:m)};
  const targets=f.targets.map(t=>t.id==='composite'?{...t,label:t.label.replace(' Voltage',` ${caption} Voltage`),evidenceTexts:[t.label.replace(' Voltage',` ${caption} Voltage`)]}:t);
  const core=presentDeterministicEvidence(targets,[],'Resistance',[group]);const es=core.evidence??[];const index=es.findIndex(e=>e.kind==='table');
  return [...assertEqual(es[index-1]?.text,caption,'Caption detached from table.'),...assertEqual(core.keyPoints.some(p=>p.includes(caption)),false,'Caption fused into prose.')];
 }),
 check('missing a separated component is still an omission',async()=>{const f=fixture();return assertEqual(findMissingRequiredEvidenceTargets(f.plan,{...f.output,sourceCore:{...f.core,keyPoints:f.core.keyPoints.filter(p=>!p.includes(components[0]!)),evidence:f.core.evidence?.filter(e=>e.text!==components[0])}}).length>0,true,'Missing definition accepted.');}),
 check('missing a table row cannot discharge header ownership',async()=>{const f=fixture();return assertEqual(findMissingRequiredEvidenceTargets(f.plan,{...f.output,sourceCore:{...f.core,evidence:f.core.evidence?.map(e=>e.kind==='table'?{...e,text:'Voltage | Current\n12 | 3'}:e)}}).length>0,true,'Incomplete ordered table accepted.');}),
 ];
}
