// Filled, colored feature glyphs (Phase 7) — the Features section's icon set, matched to the mockup.
// Every glyph: viewBox 0 0 32 32, `({ className, title })`, `data-part` hooks (see each file's JSDoc,
// shared frame in Glyph.jsx). Render the glyph at half the tile size (40 px in an 80 px tile at 1440).
import BellGlyph from './BellGlyph.jsx'
import ChartGlyph from './ChartGlyph.jsx'
import HeadsetGlyph from './HeadsetGlyph.jsx'
import LockGlyph from './LockGlyph.jsx'
import PinGlyph from './PinGlyph.jsx'
import PlugGlyph from './PlugGlyph.jsx'

export { BellGlyph, ChartGlyph, HeadsetGlyph, LockGlyph, PinGlyph, PlugGlyph }

/** Glyph components keyed by the feature's icon key (content/landing.js may reference these keys). */
export const FEATURE_GLYPHS = {
  bell: BellGlyph,
  pin: PinGlyph,
  chart: ChartGlyph,
  plug: PlugGlyph,
  lock: LockGlyph,
  headset: HeadsetGlyph,
}

/**
 * Pastel tile background per glyph, sampled from the mockup (flat fill, no border; radius ≈ 22% of the
 * tile — 18 px on an 80 px tile). Optional for the section; the glyphs work on any light background.
 */
export const FEATURE_GLYPH_TILES = {
  bell: '#DBF8E7',
  pin: '#E1EFFE',
  chart: '#F2ECFD',
  plug: '#FEF5E5',
  lock: '#FEEFF5',
  headset: '#E8FAFC',
}
