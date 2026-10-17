import type { StudyImageTarget } from '@stay-focused/shared';
import { AskImageButton } from './AskImageButton';
import { SaveImageButton } from './SaveImageButton';
import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Sheet } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { hitTarget, radius, spacing } from '../../design/tokens';
import type { ExperienceClient } from '../../services/experienceApi';
import { EXTERNAL_IMAGE_HEADERS, EXTERNAL_VISUAL_LABEL, findExternalVisual, type ExternalReferenceVisual } from '../../services/externalVisuals';
import { ZoomablePage } from './SourcePageSnapshot';

/** Batch images arrive from the reader; only an explicit replacement searches here. */
export function ExternalVisual({client,artifactId,sectionId,online,hasSourceVisual,visual,onAsk,reviewerTitle='Reviewer',sectionTitle='Section'}:{client:ExperienceClient;artifactId:string;sectionId:string;online:boolean;hasSourceVisual:boolean;visual?:ExternalReferenceVisual|null;onAsk?:(image:StudyImageTarget)=>void;reviewerTitle?:string;sectionTitle?:string}) {
  const {colors}=useTheme();const {height}=useWindowDimensions();
  const [replacement,setReplacement]=useState<ExternalReferenceVisual|null>(null);const [busy,setBusy]=useState(false);const [open,setOpen]=useState(false);
  const result=replacement??visual;
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>{setReplacement(null);setOpen(false);setBusy(false);return ()=>{pending.current?.abort();pending.current=null;};},[client,artifactId,sectionId]);
  useEffect(()=>{if(!online || hasSourceVisual){pending.current?.abort();pending.current=null;setBusy(false);setOpen(false);}},[online,hasSourceVisual]);
  const find=async()=>{
    if(!online || hasSourceVisual || !result || result.attemptCount>=2 || pending.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);
    try{const found=await findExternalVisual(client,artifactId,sectionId,true,controller.signal);if(pending.current===controller && !controller.signal.aborted && found.status==='found')setReplacement(found);}
    catch{ /* Keep the current image when no replacement is available. */ }
    finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
  };
  if(hasSourceVisual || !result)return null;
  if(!online)return <AskImageButton offline />;
  const image: StudyImageTarget | undefined = result.id ? {reference:{kind:'external_visual',id:result.id},thumbnail:result.image,label:result.title} : undefined;
  return <View style={{gap:spacing[2]}}>
    {result?.status==='found'?<View style={{gap:spacing[2],padding:spacing[3],borderWidth:1,borderColor:colors.separator,borderRadius:radius.card,backgroundColor:colors.surfaceSecondary}}>
      <Text style={{color:colors.textMuted}}>{EXTERNAL_VISUAL_LABEL}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`View external reference: ${result.title}`} onPress={()=>setOpen(true)} style={{minHeight:hitTarget.min}}>
        <Image source={{uri:result.image,headers:EXTERNAL_IMAGE_HEADERS}} accessibilityLabel={result.title} resizeMode="contain" style={{height:spacing[12]*4,width:'100%'}}
          onError={()=>setOpen(false)}/>
      </Pressable>
      <AskImageButton image={image} offline={!online} onAsk={onAsk} />
    </View>:null}
    {result.attemptCount<2?<Pressable accessibilityRole="button" accessibilityLabel="Show a different one" disabled={busy} accessibilityState={{busy,disabled:busy}}
      onPress={()=>void find()} style={{alignSelf:'flex-start',minHeight:hitTarget.min,padding:spacing[2],borderRadius:radius.control}}><Text style={{color:colors.accent}}>Show a different one</Text></Pressable>:null}
    {open && result?.status==='found'?<Sheet title="External reference" onClose={()=>setOpen(false)}>
      <Text style={{color:colors.textMuted}}>{EXTERNAL_VISUAL_LABEL}</Text>
      <View style={{height:Math.min(height*0.5,spacing[12]*8)}} onTouchStart={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()}>
        <ZoomablePage url={result.image} headers={EXTERNAL_IMAGE_HEADERS} width={result.width} height={result.height} label="External reference" onError={()=>setOpen(false)}/>
      </View>
      <AskImageButton image={image} offline={!online} onAsk={target=>{setOpen(false);onAsk?.(target);}} />
      <SaveImageButton offline={!online} image={{uri:result.image,headers:EXTERNAL_IMAGE_HEADERS,reviewerTitle,sectionTitle,kind:'external_visual',sourceTitle:result.title,attribution:`${result.credit} · ${result.license}`}} />
      <Text style={{color:colors.textPrimary}}>{result.title}</Text>
      <Pressable accessibilityRole="link" accessibilityLabel="View attribution on Wikimedia Commons" onPress={()=>{void Linking.openURL(result.sourceUrl).catch(()=>{});}} style={{minHeight:hitTarget.min,justifyContent:'center'}}>
        <Text style={{color:colors.accent}}>{result.credit} · {result.license}</Text>
      </Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel="View image license" onPress={()=>{void Linking.openURL(result.licenseUrl).catch(()=>{});}} style={{minHeight:hitTarget.min,justifyContent:'center'}}>
        <Text style={{color:colors.accent}}>License details</Text>
      </Pressable>
    </Sheet>:null}
  </View>;
}
