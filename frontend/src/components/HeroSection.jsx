import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, ArrowRight, PlayCircle } from 'lucide-react'
import styles from './HeroSection.module.css'

// Cinematic night highway video from Pexels (retained as instructed)
const VIDEO_URL = 'https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4'
const POSTER_URL = 'https://images.pexels.com/photos/325185/pexels-photo-325185.jpeg?auto=compress&cs=tinysrgb&w=1920'

const STATS = [
  { value: '94%', label: 'Giảm tai nạn' },
  { value: '0.1s', label: 'Còi hú tức thì' },
  { value: '500+', label: 'Xe tin dùng' },
  { value: '24/7', label: 'Bảo vệ liên tục' },
]

export default function HeroSection() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const onCanPlay = () => setVideoLoaded(true)
    video.addEventListener('canplay', onCanPlay)
    return () => video.removeEventListener('canplay', onCanPlay)
  }, [])

  return (
    <section className={styles.hero} id="hero" aria-label="Hero section">
      {/* ── Background Video (Retained as instructed) ── */}
      <div className={`${styles.videoWrap} ${videoLoaded ? styles.videoVisible : ''}`}>
        <video
          ref={videoRef}
          className={styles.video}
          src={VIDEO_URL}
          poster={POSTER_URL}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        />
      </div>

      {/* ── Poster fallback ── */}
      {!videoLoaded && (
        <div
          className={styles.poster}
          style={{ backgroundImage: `url(${POSTER_URL})` }}
          aria-hidden="true"
        />
      )}

      {/* ── Luminous Light Overlay ── */}
      <div className={styles.overlay} aria-hidden="true" />

      {/* ── Content ── */}
      <div className={`${styles.content} ${visible ? styles.contentVisible : ''}`}>
        {/* Badge */}
        <div className={styles.badge}>
          <Shield size={14} strokeWidth={2.5} />
          <span>Camera Giám Sát An Toàn 24/7</span>
        </div>

        {/* Headline (Concise & Impactful) */}
        <h1 className={styles.headline}>
          FLEETGUARD —<br />
          <span className={styles.headlineAccent}>CẢNH BÁO TỨC THÌ</span><br />
          KHI TÀI XẾ NGỦ GẬT
        </h1>

        {/* Tagline (Short & Direct) */}
        <p className={styles.tagline}>
          Nhận biết mắt nhắm, ngáp ngủ hay bấm điện thoại để hú còi đánh thức tức thì, bảo vệ an toàn cho cả chuyến đi.
        </p>

        {/* CTA Buttons */}
        <div className={styles.ctaGroup}>
          <button
            id="hero-cta-signup"
            className={styles.ctaPrimary}
            onClick={() => navigate('/register')}
          >
            Dùng thử miễn phí
            <ArrowRight size={17} strokeWidth={2.5} />
          </button>
          <button
            id="hero-cta-demo"
            className={styles.ctaSecondary}
            onClick={() => {
              const el = document.querySelector('#demo')
              if (el) el.scrollIntoView({ behavior: 'smooth' })
            }}
          >
            <PlayCircle size={18} strokeWidth={2} />
            Xem demo
          </button>
        </div>

        {/* Stats Row */}
        <div className={styles.statsRow}>
          {STATS.map((s, i) => (
            <div
              key={i}
              className={styles.statItem}
              style={{ animationDelay: `${0.35 + i * 0.08}s` }}
            >
              <span className={styles.statValue}>{s.value}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div className={styles.scrollIndicator} aria-hidden="true">
        <div className={styles.scrollLine} />
        <span>Cuộn xem tiếp</span>
      </div>
    </section>
  )
}
