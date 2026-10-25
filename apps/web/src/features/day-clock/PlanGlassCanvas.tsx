"use client";
import { useEffect, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { createPlanGlassLoop, planImpulse, type PlanGlassFrame } from '@stay-focused/shared/plan-glass-renderer';
import { useOrbInteraction } from '../knowledge-core/orbInteraction';
import { dayOrbTones } from './dayClock';
import metrics from '../../../public/clock/plan-atlas.json';

export interface PlanGlassHandle { press(x: number, y?: number): void }

/** Loaded by preloadDayOrb's existing promise, alongside the orb's Three module. */
export function PlanGlassCanvas({ handle, onReady, onFailure }: {
  handle: MutableRefObject<PlanGlassHandle | null>; onReady: () => void; onFailure: () => void;
}) {
  const interaction = useOrbInteraction();
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer | null = null;
    let atlas: THREE.Texture | null = null;
    let loop: ReturnType<typeof createPlanGlassLoop> | null = null;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const state: { current: PlanGlassFrame } = { current: { width: 0, height: 48, radius: 12,
      palette: () => interaction.state.current, light: dayOrbTones(720).position, glow: 0.9875, mode: 'light', running: true, reducedMotion: motion.matches, impulses: [] } };
    let focused = document.hasFocus();
    const sync = () => {
      if (disposed) return;
      const parent = element.parentElement;
      if (!parent) return;
      const style = getComputedStyle(parent);
      state.current = { ...state.current, width: parent.clientWidth, height: parent.clientHeight,
        radius: parseFloat(style.borderRadius) || 0,

        mode: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
        reducedMotion: motion.matches, running: focused && document.visibilityState === 'visible' };
      renderer?.setSize(Math.max(1, parent.clientWidth * 0.8), Math.max(1, parent.clientHeight * 0.8), false);
      loop?.wake();
    };
    const stop = () => {
      if (disposed) return;
      disposed = true; handle.current = null; interaction.wake.current = null;
      loop?.dispose(); atlas?.dispose(); renderer?.dispose();
    };
    const fail = () => { stop(); onFailure(); };
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    const focus = () => { focused = true; sync(); };
    const blur = () => { focused = false; sync(); };
    element.addEventListener('webglcontextlost', lost);
    try {
      renderer = new THREE.WebGLRenderer({ canvas: element, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      sync();
      new THREE.TextureLoader().load('/clock/plan-atlas.png', texture => {
        if (disposed) { texture.dispose(); return; }
        atlas = texture; atlas.flipY = false; atlas.generateMipmaps = false;
        atlas.minFilter = THREE.LinearFilter; atlas.magFilter = THREE.LinearFilter;
        atlas.colorSpace = THREE.NoColorSpace; atlas.needsUpdate = true;
        try {
          loop = createPlanGlassLoop(renderer!, atlas, metrics, () => {
            const now = new Date(), tones = dayOrbTones(now.getHours() * 60 + now.getMinutes());
            return { ...state.current, light: tones.position, glow: 0.35 + tones.strength * 0.75 };
          }, onReady, fail);
          interaction.wake.current = () => loop?.wake();
          handle.current = { press(x, y = 0) {
            state.current = { ...state.current, impulses: planImpulse(state.current.impulses, x, y, Date.now(), motion.matches) };
            loop?.wake();
          } };
          loop.wake();
        } catch { fail(); }
      }, undefined, fail);
    } catch { fail(); }
    const observer = new ResizeObserver(sync); observer.observe(element);
    const theme = new MutationObserver(sync);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'style', 'class'] });
    // Observe containing layout/theme changes without recreating the GL context.
    for (let node = element.parentElement; node; node = node.parentElement) {
      theme.observe(node, { attributes: true, attributeFilter: ['style', 'class'] });
    }
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', focus); window.addEventListener('blur', blur);
    window.addEventListener('resize', sync);
    return () => {
      stop(); observer.disconnect(); theme.disconnect();
      element.removeEventListener('webglcontextlost', lost);
      motion.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', focus); window.removeEventListener('blur', blur);
      window.removeEventListener('resize', sync);
    };
  }, [handle, onReady, onFailure, interaction]);
  return <canvas ref={canvas} className="plan-action-canvas" aria-hidden="true" />;
}
