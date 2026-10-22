/**
 * Idle loops for <DriverIllustration transition={false} />, one per driver state.
 *
 * Only the documented `data-part` hooks are tweened (see the JSDoc in DriverIllustration.jsx):
 * `head` / `pupils` (never the CSS-posed `head-pose` / `pupils-pose` wrappers), the eyelid groups,
 * `torso`, `zzz-N`, `mouth-yawn`, `hand-right-cheek`, `phone-glow`.
 *
 * Every loop starts and ends at the illustration's rest pose, so a paused (or never-played)
 * timeline leaves the drawing exactly as React rendered it. Build it inside a gsap context /
 * matchMedia so it is reverted on unmount.
 */

const sel = (svgRoot, part) => svgRoot.querySelector(`[data-part="${part}"]`)

/** Head nod pivot (viewBox units), from the task brief. */
const NECK = '160 145'

function normal(tl, root, gsap) {
  const torso = sel(root, 'torso')
  const head = sel(root, 'head')
  const lids = root.querySelectorAll('[data-part="eyelids"] > g')

  // Breathe: torso + head rise 1.5 units and settle, 3s per breath; two breaths per loop.
  tl.to([torso, head], { y: -1.5, duration: 1.5, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)

  // Blink every 3.5s (loop = 7s, so the rhythm stays even across repeats).
  const blink = { scaleY: 1, transformOrigin: '50% 0%', duration: 0.08, ease: 'power1.inOut', yoyo: true, repeat: 1 }
  tl.to(lids, blink, 1.2).to(lids, blink, 4.7)
  // Pad the loop to exactly 7s.
  tl.set({}, {}, 7)
}

function drowsy(tl, root, gsap) {
  const head = sel(root, 'head')
  const zs = [1, 2, 3].map((n) => sel(root, `zzz-${n}`)).filter(Boolean)
  const LOOP = 4

  // Nodding off: the rest pose (head-pose) is already slumped to the left. The head jerks
  // awake toward upright (0 → 6°, quick), then sinks back slow-then-fast (power2.in) and hangs.
  tl.to(head, { rotation: 6, svgOrigin: NECK, duration: 0.45, ease: 'power2.out' }, 0.5)
    .to(head, { rotation: 0, svgOrigin: NECK, duration: 1.9, ease: 'power2.in' }, '>0.15')

  // Zzz: each glyph drifts up along a wavy path while fading out (staggered), then fades back in
  // at its rest spot before the loop wraps. The glyphs already carry translate+scale transforms;
  // GSAP parses them into x/y/scale, so the path is built from the parsed rest position.
  zs.forEach((z, i) => {
    const x = Number(gsap.getProperty(z, 'x'))
    const y = Number(gsap.getProperty(z, 'y'))
    const dir = i === 2 ? -1 : 1 // the teal z on the left drifts outward to the left
    const at = 0.2 + i * 0.45
    tl.to(
      z,
      {
        motionPath: {
          path: [
            { x, y },
            { x: x + 4 * dir, y: y - 7 },
            { x: x - 1 * dir, y: y - 14 },
            { x: x + 5 * dir, y: y - 22 },
          ],
          curviness: 1.4,
        },
        opacity: 0,
        duration: 2.2,
        ease: 'sine.out',
      },
      at,
    )
      .set(z, { x, y }, LOOP - 0.5)
      .to(z, { opacity: 1, duration: 0.45, ease: 'power1.out' }, LOOP - 0.5)
  })
  tl.set({}, {}, LOOP)
}

function fatigued(tl, root, gsap) {
  const yawn = sel(root, 'mouth-yawn')
  const hand = sel(root, 'hand-right-cheek')

  // Yawn: mouth swells to 1.05, contracts to 0.85, returns to rest.
  tl.to(yawn, { scale: 1.05, transformOrigin: '50% 50%', duration: 0.9, ease: 'sine.out' }, 0)
    .to(yawn, { scale: 0.85, transformOrigin: '50% 50%', duration: 1.3, ease: 'sine.inOut' }, '>')
    .to(yawn, { scale: 1, transformOrigin: '50% 50%', duration: 0.9, ease: 'sine.inOut' }, '>')

  // Hand rubs the cheek: small rotation around the elbow, in sync with the yawn.
  tl.to(hand, { rotation: -3, svgOrigin: '242 206', duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: 1 }, 0.4)
  tl.set({}, {}, 3.4)
}

function distracted(tl, root, gsap) {
  const pupils = sel(root, 'pupils')
  const glow = sel(root, 'phone-glow')

  // Phone glow pulses 1 → 0.4 → 1, twice per loop.
  tl.to(glow, { opacity: 0.4, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)

  // Quick glance sideways (x 2.5), hold, back to the phone.
  tl.to(pupils, { x: 2.5, duration: 0.18, ease: 'power2.out' }, 0.9)
    .to(pupils, { x: 0, duration: 0.22, ease: 'power2.inOut' }, 2.3)
  tl.set({}, {}, 4.8)
}

const BUILDERS = { normal, drowsy, fatigued, distracted }

/**
 * Build the endless idle loop for one driver illustration.
 * @param {SVGSVGElement} svgRoot the illustration's root <svg> (`[data-part="root"]`)
 * @param {'normal'|'drowsy'|'fatigued'|'distracted'} state
 * @param {typeof import('gsap').gsap} gsap
 * @returns {gsap.core.Timeline} paused, `repeat: -1`; call `.play()` / `.pause()`
 */
export function createIdle(svgRoot, state, gsap) {
  const tl = gsap.timeline({ repeat: -1, paused: true })
  ;(BUILDERS[state] ?? normal)(tl, svgRoot, gsap)
  return tl
}
