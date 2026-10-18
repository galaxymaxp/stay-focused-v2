"use client";
import { createReviewerImageLoader, type ReviewerImages } from '@stay-focused/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../components/providers';

export function useReviewerImages(artifactId: string | null) {
  const {api,session}=useAuth();
  const owner=session?.user.id;
  const [state,setState]=useState<{artifactId:string;owner:string;data:ReviewerImages}|null>(null);
  const loader=useRef<ReturnType<typeof createReviewerImageLoader>|null>(null);
  useEffect(()=>{
    let controller:AbortController|undefined;
    const load=()=>{
      controller?.abort();loader.current=null;setState(null);
      if (!artifactId || !owner || !navigator.onLine) return;
      controller=new AbortController();
      const active=createReviewerImageLoader(artifactId,(path,options)=>api(path,options),data=>setState(data?{artifactId,owner,data}:null),controller.signal);
      loader.current=active;void active.load();
    };
    load();window.addEventListener('online',load);window.addEventListener('offline',load);
    return ()=>{controller?.abort();loader.current=null;window.removeEventListener('online',load);window.removeEventListener('offline',load);};
  },[api,artifactId,owner]);
  const refreshOnce=useCallback(()=>loader.current?.refreshOnce()??Promise.resolve(false),[]);
  return {data:state?.artifactId===artifactId && state.owner===owner?state.data:null,refreshOnce};
}
