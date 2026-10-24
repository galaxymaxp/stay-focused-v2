import { createServer, type Server } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { build } from 'esbuild';
import ts from 'typescript';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, expect, it } from 'vitest';

// Exact production component bodies and tokens in Chromium/RNW. Only identity,
// routing, provider calls and icon drawings are synthetic. This is not Android.
function extract(file: string, names: string[]) {
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  return names.map(name => {
    const node = source.statements.find(statement => ts.isFunctionDeclaration(statement) && statement.name?.text === name);
    if (!node) throw new Error(`Missing Queue fixture function ${name}`);
    return node.getText(source).replace(/^export /, '');
  }).join('\n');
}
const root = resolve('../..'), output = join(root, 'tmp/overnight/QN1/visual', String(Date.now()));
let browser: Browser, server: Server, origin: string;
beforeAll(async () => {
  mkdirSync(output, { recursive: true });
  const path = (file: string) => JSON.stringify(join(root, file).replaceAll('\\', '/'));
  const native = join(root, 'apps/mobile/src');
  const shared = `import {queueFailureCards,queueFailureReason,queueFailureTitle,queueIsIdle,isProcessingJobRetryDenied,processingJobStoppedMessage} from ${path('packages/shared/src/index.ts')};`;
  const common = `import React,{useState,useRef,useEffect,useCallback,useContext} from 'react';
import {createRoot} from 'react-dom/client';${shared}
const config=new URLSearchParams(location.search),theme=config.get('theme')||'light';
const title='SYNTHETIC_Long_Unbroken_Material_Name_'.repeat(5)+'.pdf';
const jobs=[1,2,3,4,5].map((i)=>({id:'failure-'+i,jobType:i===4?'quiz_generation':'reviewer_generation',sourceVersionId:i<4?'same':String(i),status:i===5?'expired':'failed',stage:i===5?'future_stage':'generating_sections',retryable:true,source:{displayName:title,sourceKind:'pdf',mimeType:'application/pdf'},createdAt:'2026-10-24',updatedAt:'2026-10-24',failedAt:'2026-10-24T00:00:0'+i+'Z',progress:{},retryOfJobId:null}));
const sections=[{key:'attention',title:'Needs attention',jobs}];
const record=()=>{};window.hidden=[];
const queue={open:true,anchor:{top:56,right:16},data:{jobs},sections,loading:false,refreshing:false,generating:0,queued:0,close:record,refresh:record};
const useQueueItems=()=>queue,useQueueGroups=()=>({sections,visiblePending:[],jobs,clearAttention:()=>window.hidden.push(...jobs.map(j=>j.id)),hide:record});
const request=()=>new Promise((_,reject)=>{window.releaseRetry=()=>reject(new Error('Synthetic offline retry.'));});
const useAuth=()=>({api:request,session:{user:{id:'synthetic'}}}),useRouter=()=>({push:record,replace:record}),router=useRouter();
const generationEnabled=true,generationKey=()=>({key:'synthetic',accepted:record}),CourseBatchQueue=()=>null;
const stalledInQueue=()=>false,queueProgress=()=>'',automaticQueueLabel=()=>null;
const useExperienceClient=()=>({}),experienceRequest=request,newRequestKey=()=> 'synthetic',useAppActivity=()=>({refresh:record});
document.documentElement.dataset.theme=theme;
`;
  const nativeEntry = common + `
import {View,Text,Pressable,ScrollView,Modal,Animated,ActivityIndicator,useWindowDimensions} from 'react-native-web';
import {spacing,density,hitTarget,radius,typography} from ${path('apps/mobile/src/design/tokens.ts')};
import {palettes} from ${path('apps/mobile/src/design/themeTokens.ts')};
const useTheme=()=>({colors:palettes[theme],mode:theme,reducedMotion:true}),useSafeAreaInsets=()=>({top:0,bottom:0});
const motion={spring:{}},haptic={tap:record},NavigationFeedbackContext=React.createContext(null);
const Icon=({size=18,color})=> <View style={{width:size,height:size,borderWidth:2,borderRadius:9,borderColor:color}}/>;
const ChevronRight=Icon,AlertCircle=Icon,CheckCircle2=Icon,CircleDashed=Icon,Clock3=Icon,RefreshCw=Icon;
const FileText=Icon,Presentation=Icon,FileQuestion=Icon,BookOpen=Icon,ClipboardList=Icon,Globe=Icon;
const Notice=({children})=><Text>{children}</Text>,SkeletonCards=()=>null;
${extract(join(native, 'design/primitives.tsx'), ['Copy','Surface','usePressMotion','Action','RowLink','ContentIcon'])}
${extract(join(native, 'features/queue/QueueContents.tsx'), ['QueueContents','QueueCard'])}
${extract(join(native, 'features/queue/QueueDropdown.tsx'), ['QueueDropdown'])}
createRoot(document.getElementById('root')).render(<QueueDropdown/>);`;
  const webEntry = common + `
const typeLabel=job=>job.jobType==='quiz_generation'?'Quiz':'Reviewer';
const usePathname=()=>'/today',useSearchParams=()=>new URLSearchParams(),useOrbInteraction=()=>({}),OrbStill=()=>null;
const useListPreferences=()=>({prefs:{hidden:{queue:[]}},hide:(_,id)=>window.hidden.push(id)});
const Icon=()=> <span aria-hidden="true"/>,ContentIcon=()=> <span className="content-icon" aria-hidden="true"/>;
const Notice=({children})=><p className="notice">{children}</p>;
${extract(join(root,'apps/web/src/lib/hooks.ts'), ['useAction'])}
${extract(join(root,'apps/web/src/features/queue.tsx'), ['QueueCard'])}
${extract(join(root,'apps/web/src/components/queue-button.tsx'), ['QueueButton'])}
createRoot(document.getElementById('root')).render(<div style={{position:'absolute',right:16,top:8}}><QueueButton/></div>);`;
  for (const [platform, contents] of [['web', webEntry], ['mobile', nativeEntry]]) {
    await build({ stdin: { contents, loader:'tsx', resolveDir:root }, bundle:true, outfile:join(output, `${platform}.js`), platform:'browser', jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'} });
  }
  const css = readFileSync(resolve('app/globals.css'),'utf8');
  server=createServer((request,response)=>{
    const url=new URL(request.url ?? '/', 'http://localhost');
    if (url.pathname.endsWith('.js')) { response.writeHead(200,{'Content-Type':'text/javascript'}).end(readFileSync(join(output,url.pathname.slice(1)))); return; }
    const platform=url.searchParams.get('platform')==='mobile'?'mobile':'web';
    response.writeHead(200,{'Content-Type':'text/html'}).end(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><style>${platform==='web'?css:''}body{margin:0}#behind{position:absolute;inset:0;font-size:40px;color:red;overflow-wrap:anywhere}</style><div id="behind">Synthetic page behind Queue</div><div id="root"></div><script src="/${platform}.js"></script>`);
  });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  const address=server.address(); if(!address || typeof address==='string') throw new Error('Missing loopback address');
  origin=`http://127.0.0.1:${address.port}`;
  browser=await chromium.launch({headless:true,args:['--disable-background-networking','--disable-component-update','--disable-sync']});
},60000);
afterAll(async()=>{ await browser?.close(); if(server) await new Promise<void>(done=>server.close(()=>done())); });

for(const platform of ['web','mobile']) for(const width of [320,390,768,1280]) for(const theme of ['light','dark']) for(const scale of [1,2]) {
  it(`${platform} ${width} ${theme} text ${scale}: contained failure cards and stable retry`,async()=>{
    const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
    await page.goto(`${origin}/?platform=${platform}&theme=${theme}`);
    if(platform==='web') await page.getByRole('button',{name:'Open Queue',exact:true}).click();
    const retries=page.getByRole('button',{name:'Try again',exact:true});await retries.first().waitFor();
    if(scale===2) await page.evaluate(()=>{
      for(const element of document.querySelectorAll<HTMLElement>('*')) if([...element.childNodes].some(node=>node.nodeType===3 && node.textContent?.trim())) {
        const {fontSize,lineHeight}=getComputedStyle(element);element.style.fontSize=`${parseFloat(fontSize)*2}px`;
        if(lineHeight!=='normal') element.style.lineHeight=`${parseFloat(lineHeight)*2}px`;
      }
    });
    expect(await retries.count()).toBe(3);
    await expectText('Failed 3 times');
    await expectText("Couldn't finish · Stopped while building questions. Your material is safe.");
    await expectText("Couldn't finish · Stopped before finishing. Your material is safe.");
    async function expectText(text:string){expect(await page.getByText(text,{exact:true}).count()).toBe(1);}
    const geometry=await page.evaluate(({platform})=>{
      const retry=[...document.querySelectorAll<HTMLElement>('[role="button"],button')].find(el=>el.textContent?.trim()==='Try again')!;
      const card=platform==='web'?retry.closest('.queue-failure-card')!:retry.parentElement!.parentElement!.parentElement!.parentElement!;
      const reason=[...card.querySelectorAll<HTMLElement>('*')].find(el=>el.textContent?.startsWith("Couldn't finish ·") && el.children.length===0)!;
      const rect=(el:Element)=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
      const overflow=[...document.querySelectorAll<HTMLElement>('*')].filter(el=>el.getBoundingClientRect().right>innerWidth+1).map(el=>({tag:el.tagName,id:el.id,className:el.className,text:el.textContent?.slice(0,60),...rect(el)}));
      const suffixes=[...document.querySelectorAll<HTMLElement>('*')].filter(el=>el.children.length===0 && el.textContent==='.pdf').map(el=>({...rect(el),scrollWidth:el.scrollWidth,clientWidth:el.clientWidth}));
      return {card:rect(card),retry:rect(retry),reason:rect(reason),background:getComputedStyle(card).backgroundColor,scrollWidth:document.documentElement.scrollWidth,overflow,suffixes};
    },{platform});
    writeFileSync(join(output,`${platform}-${width}-${theme}-${scale}.json`),JSON.stringify(geometry,null,2));
    await page.screenshot({path:join(output,`${platform}-${width}-${theme}-${scale}.png`),fullPage:true});
    expect(geometry.retry.width).toBeGreaterThanOrEqual(44);expect(geometry.retry.height).toBeGreaterThanOrEqual(44);
    for(const rect of [geometry.retry,geometry.reason]) {
      expect(rect.x).toBeGreaterThanOrEqual(geometry.card.x-1);expect(rect.x+rect.width).toBeLessThanOrEqual(geometry.card.x+geometry.card.width+1);
      expect(rect.y).toBeGreaterThanOrEqual(geometry.card.y-1);expect(rect.y+rect.height).toBeLessThanOrEqual(geometry.card.y+geometry.card.height+1);
    }
    expect(geometry.scrollWidth).toBeLessThanOrEqual(width);expect(geometry.background).toMatch(/^rgb\(/);
    expect(geometry.suffixes).toHaveLength(3);
    for(const suffix of geometry.suffixes){expect(suffix.width).toBeGreaterThan(0);expect(suffix.scrollWidth).toBeLessThanOrEqual(suffix.clientWidth+1);}
    const refresh=(await page.getByRole('button',{name:'Refresh queue',exact:true}).boundingBox())!;
    const close=(await page.getByRole('button',{name:platform==='web'?'Close Queue':'Close',exact:true}).boundingBox())!;
    for(const control of [refresh,close]){expect(control.x).toBeGreaterThanOrEqual(0);expect(control.x+control.width).toBeLessThanOrEqual(width);}
    const overlapX=Math.max(0,Math.min(refresh.x+refresh.width,close.x+close.width)-Math.max(refresh.x,close.x));
    const overlapY=Math.max(0,Math.min(refresh.y+refresh.height,close.y+close.height)-Math.max(refresh.y,close.y));
    expect(overlapX*overlapY).toBe(0);
    await retries.first().scrollIntoViewIfNeeded();
    const before=await retries.first().boundingBox();await retries.first().click();
    expect(await retries.first().isDisabled()).toBe(true);expect(await retries.first().boundingBox()).toEqual(before);
    await page.evaluate(()=>Reflect.get(window,'releaseRetry')());
    await page.getByText('Synthetic offline retry.',{exact:true}).waitFor();
    await retries.last().scrollIntoViewIfNeeded();
    await page.screenshot({path:join(output,`${platform}-${width}-${theme}-${scale}-last.png`),fullPage:true});
    const clear=page.getByRole('button',{name:platform==='web'?'Clear Needs attention':'Clear items that need attention',exact:true});
    await clear.click();expect(await page.evaluate(()=>Reflect.get(window,'hidden'))).toEqual(jobsIds());
    expect(errors).toEqual([]);
    writeFileSync(join(output,`${platform}-${width}-${theme}-${scale}.json`),JSON.stringify(geometry,null,2));
    await page.close();
  },30000);
}
function jobsIds(){return [1,2,3,4,5].map(i=>`failure-${i}`);}
