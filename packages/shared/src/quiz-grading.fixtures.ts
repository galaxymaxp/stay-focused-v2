import type { QuizAttempt, QuizQuestion } from './quiz';
import type { QuizAnswerKeyQuestion } from './quiz-grading';
export const question: QuizQuestion = { id: 'q1', type: 'single_select', prompt: 'Synthetic question', selectionInstruction: '', options: [{id:'a',text:'True'}, {id:'b',text:'False'}, {id:'c',text:'Third'}], difficulty: 'easy' };
export const key: QuizAnswerKeyQuestion = { id:'q1', correctOptionIds:['a'], explanation:'Synthetic explanation', topicId:'t1',topic:'Synthetic topic',sourceRefs:[],reviewerSectionIds:[] };
export const attempt: QuizAttempt = { id:'attempt',quizId:'quiz',startedAt:'2026-10-13T00:00:00Z',completedAt:'2026-10-13T00:01:00Z',status:'completed',currentQuestion:0,skippedQuestionIds:[],revealedQuestionIds:[],assistedQuestionIds:[],updatedAt:'2026-10-13T00:01:00Z',answers:[],feedback:[] };
export interface GradingFixture { name:string; question:QuizQuestion; key:QuizAnswerKeyQuestion; selected:readonly string[]; finalized?:boolean; revealed?:boolean; assisted?:boolean; percentage:number }
const matching = { ...question, type:'matching' as const, matchingPairs:[{id:'l1',leftItem:'First'},{id:'l2',leftItem:'Second'},{id:'l3',leftItem:'Third'}] };
const pairs = { ...key, correctOptionIds:['l1:a','l2:b','l3:c'] };
export const gradingFixtures: readonly GradingFixture[] = [
 {name:'single correct',question,key,selected:['a'],percentage:100},
 {name:'single incorrect',question,key,selected:['b'],percentage:0},
 {name:'multi exact unordered set',question:{...question,type:'multi_select'},key:{...key,correctOptionIds:['a','b']},selected:['b','a'],percentage:100},
 {name:'multi missing no partial credit',question:{...question,type:'multi_select'},key:{...key,correctOptionIds:['a','b']},selected:['a'],percentage:0},
 {name:'multi extra',question:{...question,type:'multi_select'},key,selected:['a','b'],percentage:0},
 {name:'true false correct',question:{...question,type:'true_false'},key,selected:['a'],percentage:100},
 {name:'true false incorrect',question:{...question,type:'true_false'},key,selected:['b'],percentage:0},
 {name:'identification NFKC punctuation case',question:{...question,type:'identification',options:[]},key:{...key,correctOptionIds:['cell wall']},selected:['  \uFF23\uFF25\uFF2C\uFF2C-WALL! '],percentage:100},
 {name:'identification alias',question:{...question,type:'identification',options:[]},key:{...key,correctOptionIds:['cell wall'],acceptedAnswers:['outer wall']},selected:['OUTER-WALL'],percentage:100},
 {name:'identification wrong',question:{...question,type:'identification',options:[]},key:{...key,correctOptionIds:['cell wall']},selected:['nucleus'],percentage:0},
 {name:'modified true',question:{...question,type:'modified_true_false'},key,selected:['a'],percentage:100},
 {name:'modified correction alias',question:{...question,type:'modified_true_false'},key:{...key,correctOptionIds:['b','cell wall'],acceptedAnswers:['outer wall']},selected:['b','\uFF2F\uFF35\uFF34\uFF25\uFF32-WALL!'],percentage:100},
 {name:'modified correction missing',question:{...question,type:'modified_true_false'},key:{...key,correctOptionIds:['b','cell wall']},selected:['b'],percentage:0},
 {name:'modified truth wrong',question:{...question,type:'modified_true_false'},key:{...key,correctOptionIds:['b','cell wall']},selected:['a','cell wall'],percentage:0},
 {name:'legacy matching',question:{...question,type:'matching',leftItem:'First'},key,selected:['a'],percentage:100},
 {name:'matching full',question:matching,key:pairs,selected:['l3:c','l1:a','l2:b'],percentage:100},
 {name:'matching partial rounded',question:matching,key:pairs,selected:['l1:a','l2:c','l3:b'],percentage:33.33},
 {name:'matching wrong',question:matching,key:pairs,selected:['l1:b','l2:c','l3:a'],percentage:0},
 {name:'unfinalized no credit',question,key,selected:['a'],finalized:false,percentage:0},
 {name:'assisted reveal no credit',question,key,selected:['a'],revealed:true,assisted:true,percentage:0},
 {name:'assisted matching no partial credit',question:matching,key:pairs,selected:['l1:a','l2:c','l3:b'],revealed:true,assisted:true,percentage:0},
 {name:'reveal after finalize retains credit',question,key,selected:['a'],revealed:true,percentage:100},
 {name:'skipped',question,key,selected:[],finalized:false,percentage:0},
];
