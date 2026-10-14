import { beforeEach,describe,expect,it,vi } from 'vitest';
import { ExperienceFailure } from '@/lib/experience/errors';
const mocks=vi.hoisted(()=>({verify:vi.fn(),find:vi.fn()}));
vi.mock('@/lib/auth',()=>({verifyBearerToken:mocks.verify}));
vi.mock('@/lib/canvas-db',()=>({createCanvasServiceClient:()=>({})}));
vi.mock('@/lib/external-visuals/service',()=>({findSectionVisual:mocks.find}));
import { POST } from './route';
const id='11111111-1111-4111-8111-111111111111';const context={params:Promise.resolve({id,sectionId:'s'})};
const request=(body='{}',headers:Record<string,string>={})=>new Request('https://local.test/visual',{method:'POST',body,headers:{authorization:'Bearer synthetic','content-type':'application/json',...headers}});
beforeEach(()=>{vi.clearAllMocks();mocks.verify.mockResolvedValue({id:'owner'});mocks.find.mockResolvedValue({status:'none',message:'No reliable visual found',attemptCount:1});});
describe('external visual POST boundary',()=>{
  it('verifies owner bearer before work, including private no-store denial',async()=>{
    mocks.verify.mockResolvedValue(null);const response=await POST(request(),context);
    expect(response.status).toBe(401);expect(response.headers.get('cache-control')).toBe('private, no-store');expect(mocks.find).not.toHaveBeenCalled();
  });
  it('uses verified owner, bounded findAnother and private no-store',async()=>{
    const response=await POST(request('{"findAnother":true}'),context);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.find).toHaveBeenCalledWith({},{userId:'owner',artifactId:id,sectionId:'s',findAnother:true});
  });
  it.each(['{"userId":"other"}','{"findAnother":"yes"}','[]','null','not json',`{"x":"${'x'.repeat(1100)}"}`])('rejects invalid/oversize body %s',async body=>{
    expect((await POST(request(body),context)).status).toBe(400);expect(mocks.find).not.toHaveBeenCalled();
  });
  it('bounds actual bytes with misleading length and oversized declared length',async()=>{
    for(const [body,length] of [['x'.repeat(1025),'1'],['{}','1025']])expect((await POST(request(body,{'content-length':length!}),context)).status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it.each([404,409,429,503])('preserves safe %s and private no-store',async status=>{
    mocks.find.mockRejectedValue(new ExperienceFailure(status,status===429?'rate_limited':status===404?'not_found':status===409?'conflict':'unavailable'));
    const response=await POST(request(),context);expect(response.status).toBe(status);expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(JSON.stringify(await response.json())).not.toContain('provider');
  });
});
