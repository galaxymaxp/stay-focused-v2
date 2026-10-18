import { refreshSnapshotUri } from '../../services/studyImageFile';
import type { StudyImageTarget } from '@stay-focused/shared';
import { AskImageButton } from './AskImageButton';
import { SaveImageButton } from './SaveImageButton';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Pressable, Text, View, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import { ImageViewer } from './ImageViewer';
import { useTheme } from '../../design/theme';
import { hitTarget, radius, spacing } from '../../design/tokens';
import { clampPagePan, clampPageZoom, readPageSnapshot, type PageSnapshot } from '../../services/sourcePageSnapshots';
import type { ExperienceClient } from '../../services/experienceApi';

/** Discover and render the exact cited page only when its topic approaches view. */
export function SourcePageSnapshot({ client, artifactId, sectionId, offline, visible=true, loadedSnapshot, refreshOnce, onAsk, onAvailability, reviewerTitle = 'Reviewer', sectionTitle = 'Section' }: {
  client: ExperienceClient; artifactId: string; sectionId: string; offline: boolean;
  visible?: boolean; loadedSnapshot?: PageSnapshot | null; refreshOnce?: () => Promise<boolean>;
  reviewerTitle?: string; sectionTitle?: string;
  onAsk?: (image: StudyImageTarget) => void;
  onAvailability?: (available: boolean | null) => void;
}) {
  const availabilityRef = useRef(onAvailability); availabilityRef.current = onAvailability;
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const waitingRef = useRef(waiting); waitingRef.current = waiting;
  const [exhausted, setExhausted] = useState(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  // Match the website: eligibility/rendering is not an inline source image.
  const localImage = snapshot?.available === true && 'url' in snapshot && snapshot.url.startsWith('file://');
  const hasImage = (!offline || localImage) && snapshot?.available === true && 'url' in snapshot;
  useEffect(() => { availabilityRef.current?.(hasImage); }, [hasImage]);
  const inFlight = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const request = useCallback(async (render: boolean) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const timeout = setTimeout(() => controller.abort(), render ? 20000 : 3000);
    try {
      const result = await readPageSnapshot(client, artifactId, sectionId, render, controller.signal);
      if (!alive.current || controller.signal.aborted || inFlight.current !== controller) return null;
      setSnapshot(result);
      if (!result.available) setOpen(false);
      return result;
    } catch {
      if (alive.current && !controller.signal.aborted && inFlight.current === controller) { setSnapshot(null); setOpen(false); }
      return null;
    } finally { clearTimeout(timeout); }
  }, [client, artifactId, sectionId]);
  useEffect(() => {
    setSnapshot(null); setOpen(false); setExhausted(false);
  }, [offline, request]);
  useEffect(() => { if (loadedSnapshot !== undefined) setSnapshot(loadedSnapshot); }, [loadedSnapshot, offline, request]);
  useEffect(() => {
    alive.current = true;
    if (loadedSnapshot !== undefined || offline || !visible) return () => { alive.current = false; inFlight.current?.abort(); };
    const discover=async()=>{
      const probe=await request(false);
      if(alive.current && probe?.available && !('url' in probe))await request(true);
    };
    void discover();
    const subscription = AppState.addEventListener('change', state => {
      setSnapshot(null); setOpen(false);
      inFlight.current?.abort();
      if (state === 'active') void discover();
    });
    // Confirm reachability without adding a native connectivity package. No
    // render admission from heartbeat; failures immediately hide the control.
    const heartbeat = setInterval(() => {
      const currentSnapshot = snapshotRef.current;
      if (!waitingRef.current && currentSnapshot && (!currentSnapshot.available || 'url' in currentSnapshot || currentSnapshot.status === 'unrendered') &&
          AppState.currentState === 'active') void request(false);
    }, 10000);
    return () => { alive.current = false; clearInterval(heartbeat); subscription.remove(); inFlight.current?.abort(); };
  }, [offline, visible, request, loadedSnapshot]);
  const snapshotStatus = snapshot?.available && 'status' in snapshot ? snapshot.status : null;
  useEffect(() => {
    if (loadedSnapshot !== undefined || offline || !visible || snapshotStatus !== 'rendering') return;
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      void request(true);
      if (polls === 5) { clearInterval(timer); setExhausted(true); }
    }, 3000);
    return () => clearInterval(timer);
  }, [offline, visible, snapshotStatus, request, loadedSnapshot]);
  const show = async () => {
    if (waiting || (offline && !localImage)) return;
    if (loadedSnapshot !== undefined) {setOpen(true);return;}
    setWaiting(true); setExhausted(false);
    const result = await request(true);
    if (alive.current && result?.available) setOpen(true);
    if (alive.current) setWaiting(false);
  };
  const failed = () => {setSnapshot(null);setOpen(false);void refreshOnce?.();};
  if (offline && !localImage) return <AskImageButton offline />;
  if (!snapshot) return null;
  const unit = snapshot.labelKind === 'slide' ? 'slide' : 'page';
  const captionUnit = snapshot.labelKind === 'slide' ? 'Slide' : 'Page';
  if (!snapshot.available) return snapshot.reason === 'source_revision_unavailable' && snapshot.page
    ? <View style={{ gap: spacing[1], padding: spacing[2] }}>
      <Text style={{ color: colors.textPrimary }}>From page {snapshot.page}</Text>
      <Text style={{ color: colors.textMuted }}>Page preview unavailable</Text>
    </View> : null;
  const ready = 'url' in snapshot ? snapshot : null;
  const image: StudyImageTarget | undefined = ready?.id ? {reference:{kind:'page_snapshot',id:ready.id},thumbnail:ready.url,label:`Source page ${ready.page}`} : undefined;
  return <>
    <View style={{gap:spacing[2],padding:spacing[3],borderRadius:radius.card,backgroundColor:colors.surfaceSecondary}}>
      <Text style={{color:colors.textMuted}}>From {unit} {snapshot.page} · your course material</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`From ${unit} ${snapshot.page}`} accessibilityState={{ busy: waiting }}
      onPress={() => void show()} style={{ minHeight: hitTarget.min }}>
      {ready ? <Image source={{ uri: ready.url }} resizeMode="contain" accessibilityIgnoresInvertColors accessibilityLabel={`${ready.sourceLabel} · ${captionUnit} ${ready.page}`}
        style={{ width:'100%', height:Math.min(420,360*ready.height/ready.width) }} onError={failed} />
        : <View style={{ height:spacing[12], backgroundColor:colors.surfacePrimary }}>
          {'status' in snapshot && snapshot.status === 'rendering' ? <ActivityIndicator color={colors.accent} /> : null}
        </View>}
    </Pressable>
    {ready ? <AskImageButton image={image} offline={offline} onAsk={onAsk} /> : null}
    </View>
    <ImageViewer key={`${sectionId}-${open}`} visible={open} title="Source page" closeLabel="Close source page" onClose={() => setOpen(false)}>
      {onZoomChange => <>
        <Text style={{ color: colors.textMuted }}>From {unit} {snapshot.page} {'\u00b7'} your course material</Text>
        <View style={{ height: windowHeight * 0.6 }}>
        {ready ? <ZoomablePage key={ready.page} url={ready.url} width={ready.width} height={ready.height} onZoomChange={onZoomChange} onError={failed} />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
            {!exhausted ? <ActivityIndicator color={colors.accent} /> : null}
            <Text style={{ color: colors.textMuted }}>{exhausted ? 'The page is still preparing. Close and open it again in a moment.' : 'Preparing source page'}</Text>
          </View>}
        </View>
        {ready ? <AskImageButton image={image} offline={offline} onAsk={target => {setOpen(false);onAsk?.(target);}} /> : null}
        {ready ? <SaveImageButton offline={offline} image={{ uri: ready.url, reviewerTitle, sectionTitle, kind: 'page_snapshot' }} refreshUri={() => refreshSnapshotUri(client,artifactId,sectionId,ready)} /> : null}
        <Text style={{ color: colors.textPrimary, textAlign: 'center', padding: spacing[4] }}>
          {ready ? `${ready.sourceLabel} · ${captionUnit} ${ready.page}` : `${captionUnit} ${snapshot.page}`}
        </Text>
      </>}
    </ImageViewer>
  </>;
}

export function ZoomablePage({ url, headers, width, height, onError, label = 'Source page', onZoomChange }: { url: string; headers?: Readonly<Record<string,string>>; width: number; height: number; onError: () => void; label?: string; onZoomChange?: (scale: number) => void }) {
  const [frame, setFrame] = useState({ width: 1, height: 1 });
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const current = useRef(transform); current.current = transform;
  const zoomCallback = useRef(onZoomChange); zoomCallback.current = onZoomChange;
  useEffect(() => { zoomCallback.current?.(transform.scale); }, [transform.scale]);
  const start = useRef({ distance: 0, scale: 1, x: 0, y: 0, touchX: 0, touchY: 0 });
  const lastTap = useRef(0);
  const moved = useRef(false);
  const measure = (event: GestureResponderEvent) => {
    const [first, second] = event.nativeEvent.touches;
    return { distance: first && second ? Math.hypot(second.pageX - first.pageX, second.pageY - first.pageY) : 0,
      touchX: first?.pageX ?? 0, touchY: first?.pageY ?? 0 };
  };
  const capture = (event: GestureResponderEvent) => {
    start.current = { ...measure(event), ...current.current }; moved.current = false;
  };
  const move = (event: GestureResponderEvent) => {
    const touch = measure(event);
    if (!!touch.distance !== !!start.current.distance) { capture(event); return; }
    if (Math.abs(touch.touchX - start.current.touchX) > 4 || Math.abs(touch.touchY - start.current.touchY) > 4 || touch.distance) moved.current = true;
    const scale = touch.distance && start.current.distance ? clampPageZoom(start.current.scale * touch.distance / start.current.distance) : start.current.scale;
    setTransform({ scale, x: clampPagePan(start.current.x + touch.touchX - start.current.touchX, frame.width, scale),
      y: clampPagePan(start.current.y + touch.touchY - start.current.touchY, frame.height, scale) });
  };
  const release = () => {
    if (moved.current) { lastTap.current = 0; return; }
    const now = Date.now();
    if (now - lastTap.current < 300) { setTransform({ scale: current.current.scale > 1 ? 1 : 2, x: 0, y: 0 }); lastTap.current = 0; }
    else lastTap.current = now;
  };
  const ratio = Math.min(frame.width / width, frame.height / height);
  return <View accessibilityLabel={`${label}. Pinch or double tap to zoom.`} style={{ flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    onLayout={event => setFrame(event.nativeEvent.layout)} onStartShouldSetResponder={() => true}
    onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => current.current.scale === 1 && !start.current.distance} onResponderTerminate={() => { lastTap.current = 0; }} onResponderGrant={capture} onResponderMove={move} onResponderRelease={release}>
    <Image source={{ uri: url, ...(headers ? {headers} : {}) }} resizeMode="contain" accessibilityIgnoresInvertColors onError={onError}
      style={{ width: width * ratio, height: height * ratio, transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.scale }] }} />
  </View>;
}
