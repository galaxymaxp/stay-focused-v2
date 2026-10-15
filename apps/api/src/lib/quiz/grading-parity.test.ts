import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {gradeQuestion,gradeAttempt,normalizeSubmittedAnswer} from '@stay-focused/shared';
import {attempt,gradingFixtures} from '../../../../../packages/shared/src/quiz-grading.fixtures';
let db:PGlite;
const user='11111111-1111-4111-8111-111111111111',id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
beforeAll(async()=>{
 db=new PGlite();
 await db.exec('create table quiz_attempts(id uuid,user_id uuid,quiz_id uuid,status text,answers jsonb,study_state jsonb,updated_at timestamptz,completed_at timestamptz,percentage numeric);create table quiz_keys(quiz_id uuid,user_id uuid,questions jsonb);');
 // Run the exact unchanged persisted grader in the existing local Postgres engine.
 const sql=readFileSync(resolve(process.cwd(),'../../packages/db/migrations/20260928131513_matching_blocks.sql'),'utf8');
 await db.exec(sql.slice(sql.indexOf('create or replace function public.complete_quiz_attempt')));
},30000);
afterAll(async()=>{await db?.close();});
describe('SQL vs shared grading fixture table',()=>{
 it.each(gradingFixtures)('$name',async f=>{
  await db.exec('truncate quiz_attempts,quiz_keys');
  const selected=normalizeSubmittedAnswer(f.question,f.key,f.selected).sort();
  const a={questionId:f.question.id,selectedOptionIds:selected,finalizedAt:f.finalized===false?null:attempt.updatedAt};
  await db.query('insert into quiz_keys values($1,$2,$3)',[id,user,JSON.stringify([{...f.question,...f.key}])]);
  await db.query("insert into quiz_attempts(id,user_id,quiz_id,status,answers,study_state) values($1,$2,$1,'in_progress',$3,$4)",[id,user,JSON.stringify([a]),JSON.stringify({assisted:f.assisted?[f.question.id]:[]})]);
  const rows=await db.query<{percentage:string}>('select percentage from complete_quiz_attempt($1,$2,false)',[user,id]);
  const feedback=gradeQuestion(f.question,f.key,f.selected);
  const local={...attempt,feedback:f.finalized!==false||f.revealed?[{...feedback,correct:f.assisted?false:feedback.correct,assisted:!!f.assisted}]:[]};
  expect(Number(rows.rows[0]!.percentage)).toBe(f.percentage);
  expect(gradeAttempt(local,[f.question],[f.key]).percentage).toBe(Number(rows.rows[0]!.percentage));
 });
});
