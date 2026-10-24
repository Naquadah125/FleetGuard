/**
 * Idle loops for <DriverIllustration />, one per driver state.
 *
 * The driver is a raster per state, so only the documented `data-part` hooks move (see the JSDoc
 * in DriverIllustration.jsx): `art` (the whole picture, a slow breath), `zzz-N`, `phone-glow`.
 *
 * Every loop starts and ends at the rest pose, so a paused (or never-played) timeline leaves the
 * illustration exactly as React rendered it. Build it inside a gsap context / matchMedia so it is
 * reverted on unmount.
 */

const sel = (root, part) => root.querySelector(`[data-part="${part}"]`)

/** Breath: the picture rises a hair and settles. `art` is overscanned 2%, so no edge shows. */
function breathe(tl, root, { lift = 0.5, half = 1.5, at = 0, times = 2 } = {}) {
  tl.to(sel(root, 'art'), { yPercent: -lift, duration: half, ease: 'sine.inOut', yoyo: true, repeat: times * 2 - 1 }, at)
}

function normal(tl, root) {
  breathe(tl, root)
  tl.set({}, {}, 6)
}

function drowsy(tl, root, gsap) {
  const zs = [1, 2, 3].map((n) => sel(root, `zzz-${n}`)).filter(Boolean)
  const LOOP = 4

  // Slow, heavy breathing while dozing.
  breathe(tl, root, { lift: 0.4, half: 2, times: 1 })

  // Zzz: each glyph drifts up along a wavy path while fading out (staggered), then fades back in
  // at its rest spot before the loop wraps. The glyphs carry translate+scale transforms; GSAP
  // parses them into x/y/scale, so the path is built from the parsed rest position.
  zs.forEach((z, i) => {
    const x = Number(gsap.getProperty(z, 'x'))
    const y = Number(gsap.getProperty(z, 'y'))
    const dir = i === 2 ? -1 : 1 // the teal z on the left drifts outward to the left
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
      0.2 + i * 0.45,
    )
      .set(z, { x, y }, LOOP - 0.5)
      .to(z, { opacity: 1, duration: 0.45, ease: 'power1.out' }, LOOP - 0.5)
  })
  tl.set({}, {}, LOOP)
}

function fatigued(tl, root) {
  // A long, tired breath in time with the yawn.
  breathe(tl, root, { lift: 0.7, half: 1.7, times: 1 })
  tl.set({}, {}, 4)
}

function distracted(tl, root) {
  // Phone light pulses 1 → 0.35 → 1, twice per loop, over a normal breath.
  tl.to(sel(root, 'phone-glow'), { opacity: 0.35, duration: 1.2, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
  breathe(tl, root, { half: 1.2 })
  tl.set({}, {}, 4.8)
}

const BUILDERS = { normal, drowsy, fatigued, distracted }

/**
 * Build the endless idle loop for one driver illustration.
 * @param {HTMLElement} root the illustration's root (`[data-part="root"]`)
 * @param {'normal'|'drowsy'|'fatigued'|'distracted'} state
 * @param {typeof import('gsap').gsap} gsap
 * @returns {gsap.core.Timeline} paused, `repeat: -1`; call `.play()` / `.pause()`
 */
export function createIdle(root, state, gsap) {
  const tl = gsap.timeline({ repeat: -1, paused: true })
  ;(BUILDERS[state] ?? normal)(tl, root, gsap)
  return tl
}
