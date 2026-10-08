// Isolated acceptance harness. Fictional data lives only in this test process.
// Never reads .env files, connects to production, or invokes a provider.
import assert from "node:assert/strict";
import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
const origin="http://127.0.0.1:3410",backend="http://127.0.0.1:3402",output=new URL("../.local/website-qa/",import.meta.url);
await mkdir(output,{recursive:true});
const user={id:"11111111-1111-4111-8111-111111111111",aud:"authenticated",role:"authenticated",email:"student@example.test",email_confirmed_at:new Date().toISOString(),app_metadata:{provider:"email"},user_metadata:{full_name:"Alex Student"},created_at:new Date().toISOString()};
const jwt=()=>[Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url"),Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600,aud:"authenticated",role:"authenticated"})).toString("base64url"),"fixture-signature"].join(".");
const counts={auth:0,api:0,paid:0};
const fixture=http.createServer(async(req,res)=>{
  res.setHeader("Access-Control-Allow-Origin","*");res.setHeader("Access-Control-Allow-Headers","authorization,apikey,content-type,x-client-info,x-supabase-api-version");res.setHeader("Access-Control-Allow-Methods","GET,POST,PUT,PATCH,DELETE,OPTIONS");res.setHeader("Content-Type","application/json");
  const send=(value,status=200)=>{res.writeHead(status);res.end(JSON.stringify(value));};
  if(req.method==="OPTIONS"){res.writeHead(204);res.end();return;}
  const url=new URL(req.url,backend);
  if(url.pathname==="/auth/v1/token"){counts.auth++;send({access_token:jwt(),refresh_token:"fictional-refresh-token",token_type:"bearer",expires_in:3600,user});return;}
  if(url.pathname==="/auth/v1/user"){send(user);return;}
  if(url.pathname==="/auth/v1/logout"){send({});return;}
  if(!req.headers.authorization?.startsWith("Bearer ")){send({ok:false,error:{code:"sign_in_required"}},401);return;}
  counts.api++;
  if(url.pathname==="/api/today"){send({ok:true,data:{date:url.searchParams.get("date"),utcOffsetMinutes:480,asOf:new Date().toISOString(),progress:{completed:0,total:0,scheduledMinutes:0},urgent:[],current:null,next:null,later:[],overdue:[],upcomingDeadlines:[],timeline:[],plannerState:{status:"not_planned",lastPlannedAt:null,needsTaskImport:false}}});return;}
  send({ok:false,error:{code:"not_found"}},404);
});
await new Promise(resolve=>fixture.listen(3402,"127.0.0.1",resolve));
let log="";
const server=spawn(process.execPath,["node_modules/next/dist/bin/next","dev","apps/web","--hostname","127.0.0.1","--port","3410"],{cwd:new URL("../",import.meta.url),windowsHide:true,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:backend,NEXT_PUBLIC_SUPABASE_ANON_KEY:"fictional-public-key",STAY_FOCUSED_API_ORIGIN:backend,NEXT_PUBLIC_GENERATION_ENABLED:"false",NEXT_TELEMETRY_DISABLED:"1"}});
server.stdout.on("data",chunk=>{log+=chunk;});server.stderr.on("data",chunk=>{log+=chunk;});
let browser;
try{
  let ready=false;for(let i=0;i<90;i++){try{if((await fetch(`${origin}/sign-in`)).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,1000));}assert(ready,"Local Next preview did not start");
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:390,height:844},timezoneId:"Asia/Manila",reducedMotion:"reduce"});
  await context.route("**/*",route=>{const host=new URL(route.request().url()).hostname;if(!["127.0.0.1","localhost"].includes(host))return route.abort();return route.continue();});
  const page=await context.newPage(),errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.goto(`${origin}/today`);await page.waitForURL("**/sign-in");
  assert.equal(counts.api,0,"Protected data requested while signed out");
  await page.screenshot({path:new URL("auth-light-mobile.png",output).pathname.replace(/^\/(.:)/,"$1"),fullPage:true});
  await page.getByLabel("Email",{exact:true}).fill(user.email);await page.getByLabel("Password",{exact:true}).fill("fictional-password");await page.getByRole("button",{name:"Sign in",exact:true}).click();
  await page.waitForURL("**/today");await page.getByRole("heading",{name:"Up Next"}).waitFor();
  assert(counts.api>0,"Shared API rewrite did not forward bearer auth");
  await page.screenshot({path:new URL("today-light-mobile.png",output).pathname.replace(/^\/(.:)/,"$1"),fullPage:true});
  await page.reload();await page.getByRole("heading",{name:"Up Next"}).waitFor();assert.equal(counts.auth,1,"Session recovery unexpectedly signed in again");
  for(const theme of ["light","dark"]){await page.evaluate(theme=>{localStorage.setItem("stay-focused-web-theme",theme);},theme);await page.reload();await page.getByRole("heading",{name:"Up Next"}).waitFor();for(const [name,width,height] of [["mobile",390,844],["desktop",1440,1000]]){await page.setViewportSize({width,height});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`${theme}/${name}: horizontal overflow`);await page.screenshot({path:new URL(`today-${theme}-${name}.png`,output).pathname.replace(/^\/(.:)/,"$1"),fullPage:true});}}
  assert.equal(counts.paid,0);assert.deepEqual(errors,[]);
  const report={result:"PASS",environment:"isolated localhost fictional API/Auth fixtures",checks:["signed-out protected route", "bearer API rewrite", "email sign-in", "persistent session reload", "light/dark", "390/1440px responsive overflow", "zero browser exceptions", "zero production/provider requests"],counts};
  await writeFile(new URL("browser-result.json",output),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){await writeFile(new URL("preview.log",output),log);throw error;}
finally{await browser?.close();server.kill();fixture.close();}
