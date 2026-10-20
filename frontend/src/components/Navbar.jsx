import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import SamsaraLogo from './SamsaraLogo'
import styles from './Navbar.module.css'

const NAV_LINKS = [
  { label: 'Tính Năng', href: '#features' },
  { label: 'Demo', href: '#demo' },
  { label: 'Bảng Giá', href: '#pricing' },
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
        {/* ── Logo with official Samsara icon ── */}
        <Link to="/" className={styles.logo} aria-label="FleetGuard Home">
          <SamsaraLogo size={32} color={scrolled ? '#0F172A' : '#FFFFFF'} accentColor="#F59E0B" />
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
