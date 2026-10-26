import { createServer, type Server } from 'node:http';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser } from 'playwright';
import { build, type Plugin } from 'vite';
import { afterAll, beforeAll, expect, it } from 'vitest';

const stubs: Record<string, string> = {
  entry: `import { createRoot } from 'react-dom/client'; import { createElement } from 'react';
    import { TodayScreen } from '${resolve('src/features/today/today-screen.tsx').replace(/\\/g, '/')}';
    createRoot(document.getElementById('root')).render(createElement('main',{style:{maxWidth:1200,margin:'0 auto',padding:'32px 24px'}},createElement(TodayScreen)));`,
  fixtures: `import { allPlanningItems } from '@stay-focused/shared'; import { generateContentStudyPlan } from '@stay-focused/shared/task-planning';
    const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
    const at=m=>new Date(2026,9,27,0,m).toISOString(); const range={startsAt:at(1200),endsAt:at(1320)};
    export const data={planningRange:range,availability:[range],freeWindowMinutes:120,personalItems:[],courses:[1,2,3,4].map(n=>({id:id(n),name:n===1?'CC17 | CITCS 3F Group A | MOBILE APPLICATION DESIGN AND DEVELOPMENT':'C'+n+' | GROUP | SYNTHETIC COURSE '+n,items:[
      {kind:'reviewer',id:id(n+10),title:n===1?'Managing Data with a Synthetic Database':'Synthetic reviewer '+n,courseId:id(n),estimateMinutes:45,openedWithin24h:false,dueAt:null,priority:'medium',createdAt:at(0)},
      {kind:'task',id:id(n+20),title:n===1?'A long synthetic task title that wraps fully on a phone without losing the final assignment words':'Synthetic task '+n,courseId:id(n),estimateMinutes:60,openedWithin24h:false,dueAt:null,priority:'medium',createdAt:at(0)}]}))};
    export const today={date:'2026-10-27',utcOffsetMinutes:0,asOf:at(1140),progress:{completed:0,total:0,scheduledMinutes:0},urgent:[],current:null,next:null,later:[],overdue:[],upcomingDeadlines:[],timeline:[],plannerState:{status:'not_planned',lastPlannedAt:null,needsTaskImport:false},capabilities:{planner:{status:'available'},calendar:{status:'available'}},announcements:{items:[],nextOffset:null},activities:{items:allPlanningItems(data).filter(i=>i.kind==='task').map(i=>({...i,id:'task:'+i.id,taskId:i.id,course:{id:i.courseId,name:'Synthetic course',code:'C'},status:'pending',source:'local',submissionTypes:[],isOverdue:false,urgency:'later',hasGeneratedDraft:false,estimatedMinutes:i.estimateMinutes,estimateSource:null}))}};
    export const api=async(path,options)=>{window.__calls??=[];window.__calls.push([path,options?.body]); if(path.endsWith('/candidates')){if(new URLSearchParams(location.search).has('loading'))return new Promise(()=>{});return {...data,...options.body}};
      if(path.endsWith('/preview')){if(location.search.includes('preview-loading'))return new Promise(()=>{});const items=allPlanningItems(data);return generateContentStudyPlan({...options.body,tasks:items.filter(i=>i.kind==='task').map(i=>({...i,estimatedMinutes:i.estimateMinutes})),reviewers:items.filter(i=>i.kind==='reviewer').map(i=>({...i,estimatedMinutes:i.estimateMinutes}))})};
      if(path.endsWith('/replan'))return {sessions:[]}; throw Error('Unexpected local fixture API '+path)};`,
  providers: `import {api} from 'pl2:fixtures'; export const useAuth=()=>({api,session:{user:{id:'synthetic-owner',user_metadata:{}}}});`,
  hooks: `import {today} from 'pl2:fixtures'; export const useResource=()=>({data:today,loading:false,refreshing:false,error:null,refresh:()=>{}});`,
  refresh: `export const useCanvasRefresh=()=>({});export const CanvasRefreshStatus=()=>null;`,
  navigation: `export const useRouter=()=>({push:path=>{window.__opened=path}});`,
  link: `import {createElement} from 'react';export default function Link({href,children,...props}){return createElement('a',{...props,href},children)}`,
};
const plugin: Plugin = { name: 'pl2-local-only', enforce: 'pre', resolveId(source) {
  if(source.startsWith('pl2:'))return '\0'+source;
  if(source==='next/navigation')return '\0pl2:navigation'; if(source==='next/link')return '\0pl2:link';
  if(/(?:^|\/)components\/providers$/.test(source))return '\0pl2:providers';
  if(/(?:^|\/)lib\/hooks$/.test(source))return '\0pl2:hooks';
  if(/(?:^|\/)lib\/canvas-refresh$/.test(source))return '\0pl2:refresh'; return null;
}, load(id) { return id.startsWith('\0pl2:') ? stubs[id.slice(5)] : null; } };
let server: Server, browser: Browser, origin: string, out: string;
const evidence = resolve('../../tmp/overnight/PL2/browser');
beforeAll(async () => {
  mkdirSync(evidence,{recursive:true}); out=mkdtempSync(resolve('../../tmp/overnight/PL2-browser-'));
  await build({ configFile:false,logLevel:'silent',root:resolve('.'),publicDir:false,plugins:[plugin],oxc:{jsx:{runtime:'automatic',development:false}},define:{'process.env.NODE_ENV':'"production"'},build:{outDir:out,emptyOutDir:true,minify:false,modulePreload:false,rollupOptions:{input:'pl2:entry',output:{format:'es',entryFileNames:'entry.js',chunkFileNames:'[name]-[hash].js'}}} });
  const css=readFileSync(resolve('app/globals.css'),'utf8')+'\n'+readFileSync(resolve('src/features/today/planner.css'),'utf8');
  server=createServer((request,response)=>{const path=new URL(request.url??'/','http://localhost').pathname;
    if(path==='/'){response.writeHead(200,{'Content-Type':'text/html'});response.end(`<!doctype html><html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><body><div id="root"></div><script type="module" src="/entry.js"></script></body></html>`);return;}
    if(path.includes('..')){response.writeHead(404).end();return;}
    try{const file=/^\/(clock|fonts|icons)\//.test(path)?join(resolve('public'),path):join(out,path);response.writeHead(200,{'Content-Type':path.endsWith('.png')?'image/png':path.endsWith('.ttf')?'font/ttf':path.endsWith('.svg')?'image/svg+xml':'text/javascript'});response.end(readFileSync(file));}catch{response.writeHead(404).end();}
  }); await new Promise<void>(yes=>server.listen(0,'127.0.0.1',yes));const address=server.address();if(!address||typeof address==='string')throw Error('local_pl2_server');origin=`http://127.0.0.1:${address.port}`;
  browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
},120_000);
afterAll(async()=>{await browser?.close();await new Promise<void>(yes=>server?server.close(()=>yes()):yes());if(out)rmSync(out,{recursive:true,force:true});});
async function open(width=1280,theme='dark',query=''){
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
  await page.addInitScript(theme=>{document.addEventListener('DOMContentLoaded',()=>document.documentElement.dataset.theme=theme,{once:true});const Original=Date;Object.defineProperty(window,'Date',{value:new Proxy(Original,{construct(target,args){return args.length?Reflect.construct(target,args):new Original(2026,9,27,19,40)}})});Object.defineProperty(window.Date,'now',{value:()=>new Original(2026,9,27,19,40).getTime()});},theme);
  if(query.includes('previous')) await page.addInitScript(()=>localStorage.setItem('sf.today.last-plan',JSON.stringify({ownerId:'synthetic-owner',date:'2026-10-27',start:1200,end:1320,sessions:[{kind:'task',id:'00000000-0000-4000-8000-000000000021',title:'Synthetic previous task',courseId:'00000000-0000-4000-8000-000000000001',startMinute:1200,minutes:60}]})));
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/'+query);return{page,errors};
}
it.each([[1280,'light'],[1280,'dark'],[390,'light'],[390,'dark']] as const)('Today columns, inline adjust, exact fit, wrapping and Up next at %i %s',async(width,theme)=>{
  const{page,errors}=await open(width,theme);try{
    await page.getByRole('button',{name:'Start now',exact:true}).waitFor();
    const clock=await page.locator('.today-clock-column').boundingBox(),work=await page.locator('.today-work-column').boundingBox();expect(clock&&work).toBeTruthy();
    if(width===1280){expect(work!.x).toBeGreaterThan(clock!.x+clock!.width);expect(Math.abs(work!.y-clock!.y)).toBeLessThan(1);}else{expect(work!.y).toBeGreaterThan(clock!.y+clock!.height);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
    expect(await page.locator('.today-v2 > :first-child').getAttribute('class')).toContain('today-clock-column');expect(await page.getByRole('dialog').count()).toBe(0);
    expect(await page.locator('.planner-fit').textContent()).toContain('120 / 120 min');expect(await page.locator('[data-testid="fit-segment"]').count()).toBe(4);
    const first=page.locator('.planner-block-card').first();await first.click();const opened=await page.evaluate(()=>(window as unknown as {__opened:string}).__opened);await page.getByRole('button',{name:'Start now',exact:true}).click();expect(await page.evaluate(()=>(window as unknown as {__opened:string}).__opened)).toBe(opened);
    expect(await page.locator('#planner-adjust').count()).toBe(0);await page.getByRole('button',{name:'Plan your free time',exact:true}).click();await page.locator('#planner-adjust').waitFor();
    expect(await page.getByRole('button',{name:'CC17 smart order'}).getAttribute('aria-expanded')).toBe('true');expect(await page.getByText('Mobile Application Design and Development',{exact:true}).count()).toBe(1);
    const check=page.getByRole('checkbox',{name:'Managing Data with a Synthetic Database',exact:true});await check.uncheck();await page.getByText('Removed from plan',{exact:true}).waitFor();expect(await check.isChecked()).toBe(false);
    await page.getByRole('button',{name:'Put back Managing Data with a Synthetic Database',exact:true}).click();expect(await check.isChecked()).toBe(true);expect(await page.locator('.planner-tray').count()).toBe(0);
    await page.getByRole('button',{name:'CC17 smart order'}).click();expect(await check.count()).toBe(0);await page.getByRole('button',{name:'CC17 smart order'}).click();
    await page.getByRole('button',{name:/Reorder A long synthetic task/}).focus();await page.keyboard.press('ArrowUp');await page.getByText('Manual order',{exact:true}).waitFor();
    expect(await page.evaluate(()=>(window as unknown as {__calls:[string,unknown][]}).__calls.filter(([path])=>path.endsWith('/candidates')).length)).toBe(1);
    await page.waitForFunction(()=>!document.querySelector('.planner-side .planner-primary')?.hasAttribute('disabled'));
    await page.screenshot({path:join(evidence,`today-${width}-${theme}.png`),fullPage:true});
    await page.getByRole('tab',{name:'Previous',exact:true}).click();expect(await page.getByText('No previous plan yet',{exact:true}).count()).toBe(1);expect(errors).toEqual([]);
  }finally{await page.close();}
},60_000);

it('Previous shows the persisted summary and status; restoring replaces edited settings with its manual selection',async()=>{
  const {page,errors}=await open(390,'dark','?previous');try{
    await page.getByRole('button',{name:'Start now',exact:true}).waitFor();
    await page.getByRole('button',{name:'Adjust plan',exact:true}).click();
    await page.getByRole('button',{name:'Reviewers',exact:true}).click();
    await page.getByRole('tab',{name:'Previous',exact:true}).click();
    expect(await page.getByText('Synthetic previous task',{exact:true}).count()).toBe(1);
    expect(await page.getByText('Planned',{exact:true}).count()).toBe(1);
    expect(await page.locator('#planner-previous .planner-fit').textContent()).toContain('0 of 1 blocks done');
    await page.getByRole('button',{name:'Restore this plan',exact:true}).click();
    await page.getByText('Manual order',{exact:true}).waitFor();
    expect(await page.getByRole('button',{name:'Both',exact:true}).getAttribute('aria-pressed')).toBe('true');
    expect(await page.getByRole('checkbox',{name:'Managing Data with a Synthetic Database',exact:true}).isChecked()).toBe(false);
    expect(await page.getByRole('checkbox',{name:/A long synthetic task/}).isChecked()).toBe(true);
    await page.waitForFunction(()=>(window as unknown as {__calls:[string,{selection?:{order:string}}][]}).__calls.filter(([path])=>path.endsWith('/preview')).at(-1)?.[1].selection?.order==='manual');
    const calls=await page.evaluate(()=>(window as unknown as {__calls:[string,{selection?:unknown}][]}).__calls);
    expect(calls.filter(([path])=>path.endsWith('/preview')).at(-1)?.[1].selection).toEqual({order:'manual',items:[{kind:'task',id:'00000000-0000-4000-8000-000000000021'}]});
    expect(errors).toEqual([]);
  }finally{await page.close();}
},60_000);


it('welcome dismiss and clock movement permanently write the device key across reload',async()=>{
  for(const move of [false,true]){
    const {page,errors}=await open(1280,'dark');try{
      const welcome=page.getByRole('complementary',{name:'Your first free-time window'});await welcome.waitFor();
      if(move){const end=page.getByRole('slider',{name:'Free time ends',exact:true});await end.focus();await page.keyboard.press('ArrowRight');}
      else await page.getByRole('button',{name:'Dismiss welcome note',exact:true}).click();
      await page.waitForFunction(()=>localStorage.getItem('sf.today.welcome-dismissed')==='1');expect(await welcome.count()).toBe(0);
      await page.reload();await page.getByRole('tab',{name:'Proposed',exact:true}).waitFor();expect(await welcome.count()).toBe(0);expect(errors).toEqual([]);
    }finally{await page.close();}
  }
},60_000);
it('planner skeleton has exact rows and busy semantics, honors Reduce Motion and never covers cached candidates',async()=>{
  const {page,errors}=await open(390,'dark','?loading');try{
    const skeleton=page.locator('.planner-skeleton');await skeleton.waitFor();expect(await skeleton.getAttribute('aria-busy')).toBe('true');
    expect(await skeleton.locator('[data-testid="skeleton-block-row"]').count()).toBe(3);expect(await skeleton.locator('[data-testid="skeleton-course-row"]').count()).toBe(4);
    expect(await skeleton.getByRole('button',{name:'Use this plan',exact:true}).isDisabled()).toBe(true);
    expect(await skeleton.locator('.planner-sk').first().evaluate(el=>getComputedStyle(el).animationName)).toBe('none');
    await page.emulateMedia({reducedMotion:'no-preference'});expect(await skeleton.locator('.planner-sk').first().evaluate(el=>getComputedStyle(el).animationDuration)).toBe('1.6s');
    await page.screenshot({path:join(evidence,'skeleton-390-dark.png'),fullPage:true});expect(errors).toEqual([]);
  }finally{await page.close();}
  const cached=await open(1280,'light','?preview-loading');try{await cached.page.getByRole('button',{name:'Start now',exact:true}).waitFor();expect(await cached.page.locator('.planner-skeleton').count()).toBe(0);expect(await cached.page.getByRole('button',{name:'Use this plan',exact:true}).isDisabled()).toBe(true);expect(cached.errors).toEqual([]);}finally{await cached.page.close();}
},60_000);
