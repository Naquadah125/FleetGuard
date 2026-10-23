// Web Audio API & SFX Alarm Manager

export const SFX_OPTIONS = [
  { id: 'warning-beep', name: 'Tiếng Beep Cảnh Báo', src: '/sfx/universfield-warning-beep-153267.mp3' },
  { id: 'loud-alarm', name: 'Còi Báo Động Lớn', src: '/sfx/flutie8211-loud-warning-alarm-607383.mp3' },
  { id: 'emergency-alarm', name: 'Báo Động Khẩn Cấp', src: '/sfx/freesound_community-emergency-alarm-with-reverb-29431.mp3' },
  { id: 'car-horn', name: 'Còi Xe Ô Tô', src: '/sfx/flutie8211-car-horn-honking-413906.mp3' },
  { id: 'police-siren', name: 'Còi Hú Cảnh Sát', src: '/sfx/engyclick-police-siren-sound-effect-317645.mp3' },
  { id: 'nuclear-alarm', name: 'Còi Báo Hạt Nhân', src: '/sfx/dragon-studio-nuclear-alarm-type-beat-386174.mp3' },
]

let audioCtx = null
let alarmInterval = null
let isMuted = false
let sfxVolume = 0.75
let currentSfxAudio = null
let previewAudio = null

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
  return audioCtx
}

// Unlock audio on first user click anywhere
if (typeof window !== 'undefined') {
  const unlock = () => {
    getAudioContext()
    window.removeEventListener('click', unlock)
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('click', unlock)
  window.addEventListener('keydown', unlock)
  window.removeEventListener('touchstart', unlock)
}

/**
 * Play selected SFX file in continuous loop until stopped
 */
export function startSfxLoop(soundSrc = SFX_OPTIONS[0].src) {
  stopSfxLoop()
  try {
    currentSfxAudio = new Audio(soundSrc)
    currentSfxAudio.loop = true
    currentSfxAudio.volume = sfxVolume
    const playPromise = currentSfxAudio.play()
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('HTML5 Audio playback failed, fallback to oscillator:', err)
        startAlarmLoop()
      })
    }
  } catch (e) {
    startAlarmLoop()
  }
}

/**
 * Stop looping SFX
 */
export function stopSfxLoop() {
  if (currentSfxAudio) {
    try {
      currentSfxAudio.pause()
      currentSfxAudio.currentTime = 0
    } catch (e) {}
    currentSfxAudio = null
  }
  stopAlarmLoop()
}

/**
 * Play brief 2.5s preview of chosen sound
 */
export function playSfxPreview(soundSrc) {
  if (previewAudio) {
    try {
      previewAudio.pause()
    } catch (e) {}
    previewAudio = null
  }
  try {
    previewAudio = new Audio(soundSrc)
    previewAudio.volume = sfxVolume
    const playPromise = previewAudio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {})
    }
    setTimeout(() => {
      if (previewAudio) {
        try {
          previewAudio.pause()
        } catch (e) {}
        previewAudio = null
      }
    }, 2500)
  } catch (e) {}
}

export function setSfxVolume(value) {
  sfxVolume = Math.min(1, Math.max(0, Number(value)))
  if (currentSfxAudio) currentSfxAudio.volume = sfxVolume
  if (previewAudio) previewAudio.volume = sfxVolume
}

export function getSfxVolume() {
  return sfxVolume
}

/**
 * Sawtooth beep fallback sweeping 880 Hz down to 440 Hz
 */
export function playLevel2Alarm() {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    const now = ctx.currentTime

    // 880Hz to 440Hz sweep
    osc.frequency.setValueAtTime(880, now)
    osc.frequency.exponentialRampToValueAtTime(440, now + 0.32)

    // Volume envelope
    gain.gain.setValueAtTime(0.01, now)
    gain.gain.linearRampToValueAtTime(0.35 * sfxVolume, now + 0.04)
    gain.gain.linearRampToValueAtTime(0.01, now + 0.34)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.35)
  } catch (e) {
    console.warn('Audio playback error', e)
  }
}

/**
 * Admin chime when a Level 2 alert is received across tabs
 */
export function playAdminChime() {
  if (isMuted) return
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc2.type = 'triangle'

    osc1.frequency.setValueAtTime(587.33, now) // D5
    osc1.frequency.setValueAtTime(880, now + 0.15) // A5

    osc2.frequency.setValueAtTime(587.33, now)
    osc2.frequency.setValueAtTime(880, now + 0.15)

    gain.gain.setValueAtTime(0.01, now)
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)
    osc1.stop(now + 0.6)
    osc2.stop(now + 0.6)
  } catch (e) {
    console.warn('Chime playback error', e)
  }
}

/**
 * Start repeating alarm every ~0.8s
 */
export function startAlarmLoop() {
  if (alarmInterval) return
  playLevel2Alarm()
  alarmInterval = setInterval(() => {
    playLevel2Alarm()
  }, 800)
}

/**
 * Stop repeating alarm
 */
export function stopAlarmLoop() {
  if (alarmInterval) {
    clearInterval(alarmInterval)
    alarmInterval = null
  }
}

export function toggleMute() {
  isMuted = !isMuted
  if (isMuted) {
    stopSfxLoop()
  }
  return isMuted
}

export function getMuteState() {
  return isMuted
}

export function setMuteState(muted) {
  isMuted = !!muted
  if (isMuted) stopSfxLoop()
}
