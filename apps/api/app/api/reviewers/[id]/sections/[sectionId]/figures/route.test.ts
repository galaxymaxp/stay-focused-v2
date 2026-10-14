import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExperienceFailure } from '@/lib/experience/errors';
const mocks=vi.hoisted(()=>({verify:vi.fn(),figures:vi.fn(),availability:vi.fn()}));
vi.mock('@/lib/auth',()=>({verifyBearerToken:mocks.verify}));
vi.mock('@/lib/canvas-db',()=>({createCanvasServiceClient:()=>({})}));
vi.mock('@/lib/source-figures/sections',()=>({getSectionFigures:mocks.figures,getSectionFigureAvailability:mocks.availability}));
import { GET } from './route';
import { GET as batch } from '../../../figures/route';
const id='11111111-1111-4111-8111-111111111111';
const context={params:Promise.resolve({id,sectionId:'s'})};
const request=()=>new Request('https://api.example.test/figures',{headers:{authorization:'Bearer synthetic'}});
beforeEach(()=>{vi.clearAllMocks();mocks.verify.mockResolvedValue({id:'verified-owner'});mocks.figures.mockResolvedValue({figures:[]});mocks.availability.mockResolvedValue({sections:[]});});
describe('figure GET authentication and cache boundary',()=>{
  it.each([false,true])('verifies bearer before work (batch=%s)',async isBatch=>{
    mocks.verify.mockResolvedValue(null);const response=await (isBatch?batch:GET)(request(),context);
    expect(response.status).toBe(401);expect(mocks.figures).not.toHaveBeenCalled();expect(mocks.availability).not.toHaveBeenCalled();
  });
  it('serves empty figure lists with verified ownership and private no-store',async()=>{
    const response=await GET(request(),context);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.json()).toEqual({ok:true,data:{figures:[]}});
    expect(mocks.figures).toHaveBeenCalledWith({},{userId:'verified-owner',artifactId:id,sectionId:'s'});
  });
  it('batches section availability behind the same auth and no-store policy',async()=>{
    const response=await batch(request(),context);expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(mocks.availability).toHaveBeenCalledWith({},{userId:'verified-owner',artifactId:id});
  });
  it('returns safe 404 for another owner and conceals provider failures',async()=>{
    mocks.figures.mockRejectedValue(new ExperienceFailure(404,'not_found'));
    expect((await GET(request(),context)).status).toBe(404);
    mocks.figures.mockRejectedValue(new Error('raw private provider error'));
    const response=await GET(request(),context);expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain('private provider');
  });
});
