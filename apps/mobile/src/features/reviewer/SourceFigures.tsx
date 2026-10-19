import { refreshFigureUri } from '../../services/studyImageFile';
import type { StudyImageTarget } from '@stay-focused/shared';
import { AskImageButton } from './AskImageButton';
import { ImageActions } from './ImageActions';
import { useEffect, useRef, useState } from 'react';
import { Image, AppState, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { ImageViewer } from './ImageViewer';
import { useTheme } from '../../design/theme';
import { hitTarget, radius, spacing } from '../../design/tokens';
import type { ExperienceClient } from '../../services/experienceApi';
import { readFigureAvailability, readSectionFigures, type SourceFigure } from '../../services/sourceFigures';
import { ZoomablePage } from './SourcePageSnapshot';

export type FigureDiscovery = ReadonlySet<string> & { readonly online?: boolean };
const EMPTY:FigureDiscovery=Object.assign(new Set<string>(),{online:false});
/** One batched, read-only discovery request for the entire Reviewer. */
export function useFigureAvailability(client:ExperienceClient,artifactId:string|null,offline:boolean):FigureDiscovery {
  const [state,setState]=useState<{artifactId:string|null;sections:FigureDiscovery}>({artifactId:null,sections:EMPTY});
  useEffect(()=>{
    let alive=true;let pending:AbortController|null=null;
    setState({artifactId,sections:EMPTY});
    if(offline || !artifactId)return;
    const read=async()=>{
      // A reachability heartbeat must not cancel an unfinished discovery read.
      if(pending)return;
      const controller=new AbortController();pending=controller;
      const timeout=setTimeout(()=>controller.abort(),15000);
      try {
        const sections=await readFigureAvailability(client,artifactId,controller.signal);
        if(alive && pending===controller && !controller.signal.aborted)setState({artifactId,sections:Object.assign(new Set(sections),{online:true})});
      }catch {if(alive && pending===controller)setState({artifactId,sections:EMPTY});}
      finally {clearTimeout(timeout);if(pending===controller)pending=null;}
    };
    void read();
    const subscription=AppState.addEventListener('change',status=>{
      pending?.abort();pending=null;setState({artifactId,sections:EMPTY});if(status==='active')void read();
    });
    const heartbeat=setInterval(()=>{if(AppState.currentState==='active')void read();},10000);
    return ()=>{alive=false;pending?.abort();clearInterval(heartbeat);subscription.remove();};
  },[client,artifactId,offline]);
  return !offline && artifactId===state.artifactId?state.sections:EMPTY;
}

export function SourceFigures({client,artifactId,sectionId,hasFigures,offline,visible=true,loadedFigures,refreshOnce,onAsk,onAvailability,reviewerTitle='Reviewer',sectionTitle='Section'}:{
  client:ExperienceClient;artifactId:string;sectionId:string;hasFigures:boolean;offline:boolean;visible?:boolean;onAsk?:(image:StudyImageTarget)=>void;
  onAvailability?:(available:boolean)=>void; loadedFigures?:readonly SourceFigure[]; refreshOnce?:()=>Promise<boolean>;
  reviewerTitle?:string;sectionTitle?:string;
}) {
  const {colors}=useTheme();const {height}=useWindowDimensions();
  const [open,setOpen]=useState(false);const [figures,setFigures]=useState<readonly SourceFigure[]>([]);
  const [index,setIndex]=useState(0);const [hidden,setHidden]=useState(false);
  const availabilityRef=useRef(onAvailability);availabilityRef.current=onAvailability;
  const localImages=figures.some(figure=>figure.url.startsWith('file://'));
  const hasImages=(!offline || localImages) && hasFigures && !hidden && figures.length>0;
  useEffect(()=>{availabilityRef.current?.(hasImages);},[hasImages]);
  const request=useRef<AbortController|null>(null);
  useEffect(()=>{
    setOpen(false);setFigures(loadedFigures ?? []);setHidden(false);setIndex(0);request.current?.abort();
    return ()=>{request.current?.abort();request.current=null;};
  },[client,artifactId,sectionId,offline,hasFigures,loadedFigures]);
  const close=()=>setOpen(false);
  useEffect(()=>{
    if(loadedFigures !== undefined || offline || !hasFigures || !visible || figures.length || hidden)return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    const timeout=setTimeout(()=>{controller.abort();if(request.current===controller){setHidden(true);setOpen(false);}},10000);
    void (async()=>{try {
      const found=await readSectionFigures(client,artifactId,sectionId,controller.signal);
      if(request.current!==controller || controller.signal.aborted)return;
      if(!found.length){setHidden(true);setOpen(false);}else setFigures(found);
    }catch {if(request.current===controller && !controller.signal.aborted){setHidden(true);setOpen(false);}}
    finally {clearTimeout(timeout);}})();
    return ()=>{controller.abort();clearTimeout(timeout);if(request.current===controller)request.current=null;};
  },[client,artifactId,sectionId,hasFigures,offline,visible,figures.length,hidden,loadedFigures]);
  const failed=()=>{setHidden(true);close();void refreshOnce?.();};
  if(offline && !localImages)return hasFigures ? <AskImageButton offline /> : null;
  if(!hasFigures || hidden)return null;
  const figure=figures[index];const label=figure?.page?`From page ${figure.page}`:figure?.slide?`From slide ${figure.slide}`:'From source';
  return <>
    {figures.length?<View style={{gap:spacing[2],padding:spacing[3],borderRadius:radius.card,backgroundColor:colors.surfaceSecondary}}>
      <Text style={{color:colors.textMuted}}>From your course material</Text>
      {figures.map((item,i)=>{
        const caption=item.slide?`Diagram from slide ${item.slide}`:item.page?`Diagram from page ${item.page}`:'Source diagram';
        return <View key={item.id}><Pressable accessibilityRole="button" accessibilityLabel={`Enlarge ${caption}`} style={{minHeight:hitTarget.min}} onPress={()=>{setIndex(i);setOpen(true);}}>
          <Image source={{uri:item.url}} accessibilityLabel={caption} resizeMode="contain" style={{width:'100%',height:Math.min(360,360*item.height/item.width)}} onError={failed}/>
        </Pressable><AskImageButton offline={offline} onAsk={onAsk} image={{reference:{kind:'figure',id:item.id},thumbnail:item.url,label:caption}} /></View>;
      })}
    </View>:null}
    {open?<ImageViewer key={figure?.id} visible title="Source figures" onClose={close}>
      {onZoomChange => <>
      <Text style={{color:colors.textMuted}}>From your course material</Text>
      {figure?<>
        <Text style={{color:colors.textPrimary}}>{label}</Text>
        <View style={{height:Math.min(height*0.5,spacing[12]*8)}}>
          <ZoomablePage key={figure.id} url={figure.url} width={figure.width} height={figure.height} label="Source figure" onZoomChange={onZoomChange}
            onError={failed}/>
        </View>
        <ImageActions offline={offline} onAsk={target=>{close();onAsk?.(target);}} image={{reference:{kind:'figure',id:figure.id},thumbnail:figure.url,label}}
          download={{uri:figure.url,reviewerTitle,sectionTitle,kind:'figure'}} refreshUri={() => refreshFigureUri(client,artifactId,sectionId,figure.id)} />
        {figures.length>1?<View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:spacing[2]}}>
          <Pressable accessibilityRole="button" accessibilityLabel="Previous figure" accessibilityState={{disabled:index===0}} disabled={index===0}
            onPress={()=>setIndex(n=>Math.max(0,n-1))} style={{minHeight:hitTarget.min,padding:spacing[2]}}><Text style={{color:index===0?colors.textMuted:colors.accent}}>Previous</Text></Pressable>
          <Text style={{color:colors.textMuted}}>{index+1} / {figures.length}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Next figure" accessibilityState={{disabled:index===figures.length-1}} disabled={index===figures.length-1}
            onPress={()=>setIndex(n=>Math.min(figures.length-1,n+1))} style={{minHeight:hitTarget.min,padding:spacing[2]}}><Text style={{color:index===figures.length-1?colors.textMuted:colors.accent}}>Next</Text></Pressable>
        </View>:null}
      </>:null}
      </>}
    </ImageViewer>:null}
  </>;
}
