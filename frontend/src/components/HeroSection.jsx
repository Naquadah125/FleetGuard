import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import heroPoster from '../assets/hero_bg.jpg'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [videoLoaded, setVideoLoaded] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoaded = () => setVideoLoaded(true)

    if (video.readyState >= 2) {
      setVideoLoaded(true)
    }

    video.addEventListener('canplay', handleLoaded)
    video.addEventListener('loadeddata', handleLoaded)
    video.addEventListener('playing', handleLoaded)

    return () => {
      video.removeEventListener('canplay', handleLoaded)
      video.removeEventListener('loadeddata', handleLoaded)
      video.removeEventListener('playing', handleLoaded)
    }
  }, [])

  const handleCheckPrices = () => {
    const el = document.querySelector('#pricing')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/#pricing')
    }
  }

  const handleSeeDemo = () => {
    const el = document.querySelector('#demo')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate('/driver/camera')
    }
  }

  return (
    <section className={styles.hero} id="hero" aria-label="Hero section">
      {/* ── Background Video ── */}
      <div className={`${styles.videoWrap} ${videoLoaded ? styles.videoVisible : ''}`}>
        <video
          ref={videoRef}
          className={styles.video}
          poster={heroPoster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
        >
          <source src="/samsara-hero.mp4" type="video/mp4" />
          <source
            src="https://videos.ctfassets.net/bx9krvy0u3sx/6wWSh6X0n2vyiwZdYx4Ghn/10520707fe3901c6bff843c619a50041/S26-1032-ProjectOwlHomepageHero_WB_ChloeChung_US_AJ_v11_Desktop_compressed__2_.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* ── Poster fallback ── */}
      {!videoLoaded && (
        <div
          className={styles.poster}
          style={{ backgroundImage: `url(${heroPoster})` }}
          aria-hidden="true"
        />
      )}

      {/* ── Subtle Cinematic Dark Tint (Zero white fog, video 100% visible) ── */}
      <div className={styles.overlay} aria-hidden="true" />

      {/* ── Centered Content matching Samsara layout ── */}
      <div className={`${styles.content} ${visible ? styles.contentVisible : ''}`}>
        {/* Headline — Short & bold */}
        <h1 className={styles.headline}>
          CHUẨN VẬN HÀNH.<br />
          CHỨNG MINH THỰC TẾ.
        </h1>

        {/* Tagline — 1 short sentence */}
        <p className={styles.tagline}>
          Nâng cao an toàn, giảm thiểu tai nạn và tối ưu chi phí đội xe.
        </p>

        {/* Dual CTAs matching Samsara screenshot */}
        <div className={styles.ctaGroup}>
          <button
            id="hero-cta-pricing"
            className={styles.ctaPricing}
            onClick={handleCheckPrices}
          >
            <span>Xem bảng giá</span>
            <ArrowRight size={17} strokeWidth={2.5} />
          </button>
          <button
            id="hero-cta-demo"
            className={styles.ctaDemo}
            onClick={handleSeeDemo}
          >
            <span>Xem demo</span>
          </button>
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
