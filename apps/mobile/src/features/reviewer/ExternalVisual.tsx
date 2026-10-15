import { useEffect, useRef, useState } from 'react';
import { Image, Linking, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Sheet } from '../../design/primitives';
import { useTheme } from '../../design/theme';
import { hitTarget, radius, spacing } from '../../design/tokens';
import type { ExperienceClient } from '../../services/experienceApi';
import { EXTERNAL_VISUAL_LABEL, findExternalVisual, type ExternalVisual as Visual } from '../../services/externalVisuals';
import { ZoomablePage } from './SourcePageSnapshot';

/** Never fetch on mount. Result state/URLs are ephemeral and separate from source UI. */
export function ExternalVisual({client,artifactId,sectionId,online,hasSourceVisual}:{client:ExperienceClient;artifactId:string;sectionId:string;online:boolean;hasSourceVisual:boolean}) {
  const {colors}=useTheme();const {height}=useWindowDimensions();
  const [result,setResult]=useState<Visual|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState(false);const [open,setOpen]=useState(false);
  const pending=useRef<AbortController|null>(null);
  useEffect(()=>{setResult(null);setError(false);return ()=>{pending.current?.abort();pending.current=null;};},[client,artifactId,sectionId]);
  useEffect(()=>{if(!online || hasSourceVisual){pending.current?.abort();pending.current=null;setBusy(false);setOpen(false);}},[online,hasSourceVisual]);
  const find=async(another:boolean)=>{
    if(!online || hasSourceVisual || pending.current)return;
    const controller=new AbortController();pending.current=controller;setBusy(true);setError(false);
    try{const found=await findExternalVisual(client,artifactId,sectionId,another,controller.signal);if(pending.current===controller && !controller.signal.aborted)setResult(found);}
    catch{if(pending.current===controller && !controller.signal.aborted)setError(true);}
    finally{if(pending.current===controller){pending.current=null;setBusy(false);}}
  };
  if(!online || hasSourceVisual)return null;
  const action=(label:string,another:boolean)=><Pressable accessibilityRole="button" accessibilityLabel={label} disabled={busy} accessibilityState={{busy,disabled:busy}}
    onPress={()=>void find(another)} style={{alignSelf:'flex-start',minHeight:hitTarget.min,padding:spacing[2],borderRadius:radius.control}}><Text style={{color:colors.accent}}>{busy?'Looking for a visual…':label}</Text></Pressable>;
  return <View style={{gap:spacing[2]}}>
    {!result?action('Find a visual',false):null}
    {result?.status==='found'?<View style={{gap:spacing[2],padding:spacing[3],borderWidth:1,borderColor:colors.separator,borderRadius:radius.card,backgroundColor:colors.surfaceSecondary}}>
      <Text style={{color:colors.textMuted}}>{EXTERNAL_VISUAL_LABEL}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="View external reference" onPress={()=>setOpen(true)}>
        <Image source={{uri:result.image}} accessibilityLabel={result.title} resizeMode="contain" style={{height:spacing[12]*4,width:'100%'}} onError={()=>{setResult(null);setOpen(false);setError(true);}}/>
      </Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel="View attribution on Wikimedia Commons" onPress={()=>{void Linking.openURL(result.sourceUrl).catch(()=>setError(true));}} style={{minHeight:hitTarget.min,justifyContent:'center'}}>
        <Text style={{color:colors.accent}}>{result.credit} · {result.license}</Text>
      </Pressable>
      <Pressable accessibilityRole="link" accessibilityLabel="View image license" onPress={()=>{void Linking.openURL(result.licenseUrl).catch(()=>setError(true));}} style={{minHeight:hitTarget.min,justifyContent:'center'}}>
        <Text style={{color:colors.accent}}>License details</Text>
      </Pressable>
    </View>:result?.status==='none'?<Text style={{color:colors.textMuted}}>No reliable visual found</Text>:null}
    {result?.attemptCount===1?action('Find another',true):null}
    {error?<Text style={{color:colors.textMuted}}>Couldn’t find a visual right now. Try again when you’re online.</Text>:null}
    {open && result?.status==='found'?<Sheet title="External reference" onClose={()=>setOpen(false)}>
      <Text style={{color:colors.textMuted}}>{EXTERNAL_VISUAL_LABEL}</Text>
      <View style={{height:Math.min(height*0.5,spacing[12]*8)}} onTouchStart={e=>e.stopPropagation()} onTouchMove={e=>e.stopPropagation()}>
        <ZoomablePage url={result.image} width={result.width} height={result.height} label="External reference" onError={()=>{setOpen(false);setError(true);}}/>
      </View>
      <Text style={{color:colors.textMuted}}>{result.credit} · {result.license}</Text>
    </Sheet>:null}
  </View>;
}
