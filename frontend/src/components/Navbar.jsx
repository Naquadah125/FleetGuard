import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { label: 'Tính Năng', href: '#features' },
  { label: 'Demo', href: '#demo' },
  { label: 'Về Chúng Tôi', href: '#about' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleNavClick = (href) => {
    setMenuOpen(false)
    if (href.startsWith('#')) {
      const el = document.querySelector(href)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <header className={`${styles.navbar} ${scrolled ? styles.scrolled : styles.transparent}`}>
      <div className={styles.inner}>
        {/* ── Logo ── */}
        <Link to="/" className={styles.logo} aria-label="FleetGuard Home">
          {/* Samsara owl SVG recolored to Amber */}
          <svg
            width="32"
            height="32"
            viewBox="0 0 200 200"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Shield shape */}
            <path
              d="M100 10 L175 45 L175 110 Q175 155 100 185 Q25 155 25 110 L25 45 Z"
              fill="#F59E0B"
              opacity="0.15"
            />
            <path
              d="M100 10 L175 45 L175 110 Q175 155 100 185 Q25 155 25 110 L25 45 Z"
              stroke="#F59E0B"
              strokeWidth="8"
              fill="none"
            />
            {/* Eye (camera lens) */}
            <circle cx="100" cy="105" r="32" fill="#F59E0B" opacity="0.9" />
            <circle cx="100" cy="105" r="18" fill="#0A1628" />
            <circle cx="100" cy="105" r="8" fill="#F59E0B" />
            <circle cx="107" cy="98" r="4" fill="white" opacity="0.6" />
          </svg>
          <span className={styles.logoText}>
            Fleet<span className={styles.logoAccent}>Guard</span>
          </span>
        </Link>

        {/* ── Nav Links (desktop) ── */}
        <nav className={styles.navLinks} aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              className={styles.navLink}
              onClick={() => handleNavClick(link.href)}
              id={`nav-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* ── Auth Buttons (desktop) ── */}
        <div className={styles.authGroup}>
          <button
            id="btn-login"
            className={styles.btnGhost}
            onClick={() => navigate('/login')}
          >
            Đăng nhập
          </button>
          <button
            id="btn-signup"
            className={styles.btnAmber}
            onClick={() => navigate('/register')}
          >
            Đăng ký
          </button>
        </div>

        {/* ── Hamburger (mobile) ── */}
        <button
          id="btn-menu-toggle"
          className={styles.hamburger}
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile Menu ── */}
      {menuOpen && (
        <div className={styles.mobileMenu}>
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              className={styles.mobileLink}
              onClick={() => handleNavClick(link.href)}
            >
              {link.label}
            </button>
          ))}
          <hr className={styles.mobileDivider} />
          <button
            className={styles.mobileLink}
            onClick={() => { setMenuOpen(false); navigate('/login') }}
          >
            Đăng nhập
          </button>
          <button
            className={`${styles.mobileLink} ${styles.mobileLinkAmber}`}
            onClick={() => { setMenuOpen(false); navigate('/register') }}
          >
            Đăng ký
          </button>
        </div>
      )}
    </header>
  )
}
