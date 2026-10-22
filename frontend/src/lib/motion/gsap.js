/**
 * Single GSAP entry point for the app. Registers every plugin once.
 * Import gsap / plugins / useGSAP from here — never from 'gsap' directly.
 */
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ScrollSmoother } from 'gsap/ScrollSmoother'
import { SplitText } from 'gsap/SplitText'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { Flip } from 'gsap/Flip'
import { CustomEase } from 'gsap/CustomEase'
import { CustomWiggle } from 'gsap/CustomWiggle'
import { useGSAP } from '@gsap/react'

// CustomEase must be registered before CustomWiggle.
gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Flip,
  CustomEase,
  CustomWiggle,
)

// Web fonts swapping in after ScrollTrigger's first measurement shift every trigger position
// (and break clamp() starts near the page bottom). Re-measure whenever a font batch finishes.
// Module-level, registered once for the app's lifetime.
if (typeof document !== 'undefined' && document.fonts?.addEventListener) {
  document.fonts.addEventListener('loadingdone', () => ScrollTrigger.refresh())
}

// Dev-only hook for verification scripts (no-leak / reduced-motion checks).
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__fg = { gsap, ScrollTrigger }
}

export {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  Flip,
  useGSAP,
  // Extra re-exports so sections never need to import from 'gsap/*' themselves.
  DrawSVGPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  CustomEase,
  CustomWiggle,
}
