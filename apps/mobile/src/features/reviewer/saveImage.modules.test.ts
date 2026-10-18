import { afterEach, expect, it, vi } from 'vitest';

vi.mock('react-native',()=>({Platform:{OS:'android'},Linking:{}}));
afterEach(()=>{vi.doUnmock('expo-media-library/legacy');vi.doUnmock('expo-file-system/legacy');vi.resetModules();});

it.each(['expo-media-library/legacy','expo-file-system/legacy'])('reports module_missing when %s cannot import',async module=>{
  vi.resetModules();
  vi.spyOn(console,'warn').mockImplementation(()=>{});
  vi.doMock('expo-media-library/legacy',()=>({requestPermissionsAsync:vi.fn(async()=>({granted:true}))}));
  vi.doMock(module,()=>{throw new Error('private module failure');});
  const {saveImage}=await import('./saveImage');
  expect(await saveImage({uri:'https://image.test/private',reviewerTitle:'Private',sectionTitle:'Private',kind:'figure'})).toEqual({status:'failed',stage:'module_missing',message:'Update the app to save images'});
  expect(console.warn).toHaveBeenCalledExactlyOnceWith('reviewer.save_image_failed',{stage:'module_missing'});
});
