import { createReviewerImageLoader, type ReviewerImages } from '@stay-focused/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { experienceRequest, type ExperienceClient } from './experienceApi';
import { requireApiBaseUrl } from '../config/apiBaseUrlResolution';

/** Owner/token changes, backgrounding and offline copies discard ephemeral URLs. */
export function useReviewerImages(client: ExperienceClient, artifactId: string | null, offline: boolean) {
  const [state,setState]=useState<{client:ExperienceClient;artifactId:string;data:ReviewerImages}|null>(null);
  const loader=useRef<ReturnType<typeof createReviewerImageLoader>|null>(null);
  useEffect(()=>{
    let controller:AbortController|undefined;
    let alive=true,connected=true,probing=false,probeController:AbortController|undefined;
    const load=()=>{
      probeController?.abort();probeController=undefined;probing=false;
      controller?.abort();loader.current=null;setState(null);
      if (offline || !artifactId || !client.accessToken || AppState.currentState!=='active') return;
      controller=new AbortController();
      connected=true;
      const active=createReviewerImageLoader(artifactId,(path,options)=>experienceRequest(client,path,options),data=>{connected=!!data;setState(data?{client,artifactId,data}:null);},controller.signal);
      loader.current=active;void active.load();
    };
    load();const subscription=AppState.addEventListener('change',load);
    // Retain the existing reachability guard without reloading every section or
    // sending signed image URLs. The public health route has no academic data.
    const heartbeat=setInterval(()=>{
      if(offline || !artifactId || probing || AppState.currentState!=='active')return;
      probing=true;const probe=new AbortController();probeController=probe;
      const timeout=setTimeout(()=>probe.abort(),3000);
      void (async()=>{
        try {
          const response=await (client.fetchImpl??fetch)(`${requireApiBaseUrl(client.baseUrl)}/api/health`,{signal:probe.signal,cache:'no-store'});
          if(!response.ok)throw new Error('unavailable');
          if(alive && probeController===probe && !connected)load();
        }catch {if(alive && probeController===probe){connected=false;controller?.abort();loader.current=null;setState(null);}}
        finally {clearTimeout(timeout);if(probeController===probe){probing=false;probeController=undefined;}}
      })();
    },10000);
    return ()=>{alive=false;controller?.abort();probeController?.abort();loader.current=null;clearInterval(heartbeat);subscription.remove();};
  },[client,artifactId,offline]);
  const refreshOnce=useCallback(()=>loader.current?.refreshOnce()??Promise.resolve(false),[]);
  return {data:!offline && state?.client===client && state.artifactId===artifactId?state.data:null,refreshOnce};
}
