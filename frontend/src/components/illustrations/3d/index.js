// "Clay 3D" badge set — floating accents (Phase 6). Every badge: viewBox 0 0 120 120, transparent,
// `data-part` body / shadow / shine + object parts (see each file's JSDoc and Badge3D.jsx).
// For the AI chip accent reuse ../AiChip.jsx (different viewBox / hooks).
import BellBadge3D from './BellBadge3D.jsx'
import CameraBadge3D from './CameraBadge3D.jsx'
import ChartBadge3D from './ChartBadge3D.jsx'
import HeadsetBadge3D from './HeadsetBadge3D.jsx'
import LockBadge3D from './LockBadge3D.jsx'
import PinBadge3D from './PinBadge3D.jsx'
import ShieldBadge3D from './ShieldBadge3D.jsx'
import SteeringBadge3D from './SteeringBadge3D.jsx'
import TruckBadge3D from './TruckBadge3D.jsx'

export {
  BellBadge3D,
  CameraBadge3D,
  ChartBadge3D,
  HeadsetBadge3D,
  LockBadge3D,
  PinBadge3D,
  ShieldBadge3D,
  SteeringBadge3D,
  TruckBadge3D,
}

/** Badge components keyed by a short name (for data-driven placement). */
export const BADGES_3D = {
  shield: ShieldBadge3D,
  bell: BellBadge3D,
  pin: PinBadge3D,
  camera: CameraBadge3D,
  chart: ChartBadge3D,
  steering: SteeringBadge3D,
  lock: LockBadge3D,
  headset: HeadsetBadge3D,
  truck: TruckBadge3D,
}
