import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, ArrowLeft, Key, AlertCircle } from 'lucide-react'
import SamsaraLogo from '../components/SamsaraLogo'
import styles from './Auth.module.css'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleQuickFill = (demoEmail) => {
    setEmail(demoEmail)
    setPassword('password123')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        localStorage.setItem('fleet_token', data.token)
        localStorage.setItem('fleet_user', JSON.stringify(data.user))

        navigate('/')
        return
      } else {
        throw new Error(data.message || 'Sai thông tin đăng nhập')
      }
    } catch (err) {
      // If backend is offline or returned error, check demo accounts for smooth experience
      const lowerEmail = email.toLowerCase()
      if (
        (lowerEmail === 'user@fleet.vn' || lowerEmail === 'driver@fleet.vn' || lowerEmail === 'admin@fleet.vn') &&
        password === 'password123'
      ) {
        const isAdmin = lowerEmail.includes('admin')
        const mockUser = {
          id: isAdmin ? 'demo_admin' : 'demo_user',
          name: isAdmin ? 'Fleet Manager' : 'Tài xế Nguyễn Văn A',
          email: lowerEmail,
          role: isAdmin ? 'ADMIN' : 'USER',
        }
        localStorage.setItem('fleet_token', 'demo_token_' + Date.now())
        localStorage.setItem('fleet_user', JSON.stringify(mockUser))

        navigate('/')
      } else {
        setError(err.message || 'Không thể kết nối đến máy chủ. Hãy thử dùng tài khoản mẫu.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.authWrapper}>
      <Link to="/" className={styles.backHome}>
        <ArrowLeft size={16} />
        <span>Về trang chủ</span>
      </Link>

      <div className={styles.authCard}>
        <div className={styles.cardHeader}>
          <Link to="/" className={styles.cardLogo}>
            <SamsaraLogo size={34} color="#0F172A" accentColor="#F59E0B" />
            <span className={styles.logoText}>
              Fleet<span className={styles.logoAccent}>Guard</span>
            </span>
          </Link>
          <h1 className={styles.cardTitle}>Đăng Nhập Hệ Thống</h1>
          <p className={styles.cardSubtitle}>Nền tảng giám sát tài xế AI thời gian thực</p>
        </div>

        {/* Quick Demo Credentials Fill */}
        <div className={styles.quickAccounts}>
          <div className={styles.quickHeader}>
            <Key size={13} />
            <span>Tài Khoản Kiểm Thử Nhanh</span>
          </div>
          <div className={styles.quickButtons}>
            <button
              type="button"
              className={styles.quickBtn}
              onClick={() => handleQuickFill('user@fleet.vn', 'USER')}
            >
              Tài Xế (user@fleet.vn)
            </button>
            <button
              type="button"
              className={styles.quickBtn}
              onClick={() => handleQuickFill('admin@fleet.vn', 'ADMIN')}
            >
              Quản Trị (admin@fleet.vn)
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.errorBanner} style={{ marginBottom: 16 }}>
            <AlertCircle size={15} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: 6 }} />
            {error}
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="email">Email đăng nhập</label>
            <div className={styles.inputWrapper}>
              <Mail className={styles.inputIcon} size={18} />
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="name@fleet.vn"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="password">Mật khẩu</label>
            <div className={styles.inputWrapper}>
              <Lock className={styles.inputIcon} size={18} />
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-login-submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
            <ArrowRight size={17} />
          </button>
        </form>

        <div className={styles.cardFooter}>
          <span>Chưa có tài khoản?</span>
          <Link to="/register" className={styles.linkAccent}>Đăng ký ngay</Link>
        </div>
      </div>
    </div>
  )
}
