import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Image, Modal, Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../design/theme';
import { hitTarget, radius, spacing } from '../../design/tokens';
import { clampPagePan, clampPageZoom, readPageSnapshot, type PageSnapshot } from '../../services/sourcePageSnapshots';
import type { ExperienceClient } from '../../services/experienceApi';

/** Availability discovery is read-only. Rendering begins only on image open. */
export function SourcePageSnapshot({ client, artifactId, sectionId, offline, onAvailability }: {
  client: ExperienceClient; artifactId: string; sectionId: string; offline: boolean;
  onAvailability?: (available: boolean | null) => void;
}) {
  const availabilityRef = useRef(onAvailability); availabilityRef.current = onAvailability;
  const { colors, reducedMotion } = useTheme();
  const [snapshot, setSnapshot] = useState<PageSnapshot | null>(null);
  const [open, setOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const waitingRef = useRef(waiting); waitingRef.current = waiting;
  const [exhausted, setExhausted] = useState(false);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const inFlight = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const request = useCallback(async (render: boolean) => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const timeout = setTimeout(() => controller.abort(), render ? 20000 : 3000);
    try {
      const result = await readPageSnapshot(client, artifactId, sectionId, render, controller.signal);
      if (!alive.current || inFlight.current !== controller) return null;
      setSnapshot(result);
      availabilityRef.current?.(result.available);
      if (!result.available) setOpen(false);
      return result;
    } catch {
      if (alive.current && inFlight.current === controller) { setSnapshot(null); setOpen(false); availabilityRef.current?.(null); }
      return null;
    } finally { clearTimeout(timeout); }
  }, [client, artifactId, sectionId]);
  useEffect(() => {
    alive.current = true;
    setSnapshot(null); setOpen(false); setExhausted(false);
    availabilityRef.current?.(null);
    if (offline) return () => { alive.current = false; inFlight.current?.abort(); };
    void request(false);
    const subscription = AppState.addEventListener('change', state => {
      setSnapshot(null); setOpen(false);
      availabilityRef.current?.(null);
      inFlight.current?.abort();
      if (state === 'active') void request(false);
    });
    // Confirm reachability without adding a native connectivity package. No
    // render admission from heartbeat; failures immediately hide the control.
    const heartbeat = setInterval(() => {
      const currentSnapshot = snapshotRef.current;
      if (!waitingRef.current && currentSnapshot && (!currentSnapshot.available || 'url' in currentSnapshot || currentSnapshot.status === 'unrendered') &&
          AppState.currentState === 'active') void request(false);
    }, 10000);
    return () => { alive.current = false; clearInterval(heartbeat); subscription.remove(); inFlight.current?.abort(); };
  }, [offline, request]);
  const snapshotStatus = snapshot?.available && 'status' in snapshot ? snapshot.status : null;
  useEffect(() => {
    if (!open || snapshotStatus !== 'rendering') return;
    let polls = 0;
    const timer = setInterval(() => {
      polls += 1;
      void request(true);
      if (polls === 5) { clearInterval(timer); setExhausted(true); }
    }, 3000);
    return () => clearInterval(timer);
  }, [open, snapshotStatus, request]);
  const show = async () => {
    if (waiting || offline) return;
    setWaiting(true); setExhausted(false);
    const result = await request(true);
    if (alive.current && result?.available) setOpen(true);
    if (alive.current) setWaiting(false);
  };
  if (offline || !snapshot) return null;
  const unit = snapshot.labelKind === 'slide' ? 'slide' : 'page';
  const captionUnit = snapshot.labelKind === 'slide' ? 'Slide' : 'Page';
  if (!snapshot.available) return snapshot.reason === 'source_revision_unavailable' && snapshot.page
    ? <View style={{ gap: spacing[1], padding: spacing[2] }}>
      <Text style={{ color: colors.textPrimary }}>From page {snapshot.page}</Text>
      <Text style={{ color: colors.textMuted }}>Page preview unavailable</Text>
    </View> : null;
  const ready = 'url' in snapshot ? snapshot : null;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`From ${unit} ${snapshot.page}`} accessibilityState={{ busy: waiting }}
      onPress={() => void show()} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2], minHeight: hitTarget.min,
        alignSelf: 'flex-start', padding: spacing[2], borderRadius: radius.control, backgroundColor: colors.surfaceSecondary }}>
      {ready ? <Image source={{ uri: ready.url }} resizeMode="contain" accessibilityIgnoresInvertColors
        style={{ width: spacing[12], height: spacing[12] }} onError={() => { setSnapshot(null); setOpen(false); }} />
        : <View style={{ width: spacing[12], height: spacing[12], backgroundColor: colors.surfacePrimary }}>
          {'status' in snapshot && snapshot.status === 'rendering' ? <ActivityIndicator color={colors.accent} /> : null}
        </View>}
      <Text style={{ color: colors.accent }}>From {unit} {snapshot.page}</Text>
    </Pressable>
    <Modal visible={open} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.backgroundPrimary }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close source page" onPress={() => setOpen(false)}
          style={{ minHeight: hitTarget.min, padding: spacing[4], alignSelf: 'flex-end' }}><Text style={{ color: colors.accent }}>Close</Text></Pressable>
        {ready ? <ZoomablePage key={ready.page} url={ready.url} width={ready.width} height={ready.height} onError={() => { setSnapshot(null); setOpen(false); }} />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
            {!exhausted ? <ActivityIndicator color={colors.accent} /> : null}
            <Text style={{ color: colors.textMuted }}>{exhausted ? 'The page is still preparing. Close and open it again in a moment.' : 'Preparing source page'}</Text>
          </View>}
        <Text style={{ color: colors.textPrimary, textAlign: 'center', padding: spacing[4] }}>
          {ready ? `${ready.sourceLabel} · ${captionUnit} ${ready.page}` : `${captionUnit} ${snapshot.page}`}
        </Text>
      </SafeAreaView>
    </Modal>
  </>;
}

export function ZoomablePage({ url, width, height, onError, label = 'Source page' }: { url: string; width: number; height: number; onError: () => void; label?: string }) {
  const [frame, setFrame] = useState({ width: 1, height: 1 });
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const current = useRef(transform); current.current = transform;
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
    onMoveShouldSetResponder={() => true} onResponderTerminationRequest={() => false} onResponderGrant={capture} onResponderMove={move} onResponderRelease={release}>
    <Image source={{ uri: url }} resizeMode="contain" accessibilityIgnoresInvertColors onError={onError}
      style={{ width: width * ratio, height: height * ratio, transform: [{ translateX: transform.x }, { translateY: transform.y }, { scale: transform.scale }] }} />
  </View>;
}
